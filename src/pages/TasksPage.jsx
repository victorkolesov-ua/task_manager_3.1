import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchTasksFromGitHub,
    loadGitHubConfig,
    readLocalTasks,
    saveLocalTasks,
    saveTasksToGitHub,
} from '../services/githubTaskService';

export default function TasksPage() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [editingId, setEditingId] = useState(null);
    const [draftDescription, setDraftDescription] = useState('');
    const [draftScheduledAt, setDraftScheduledAt] = useState('');
    const [saveError, setSaveError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    async function persistTasks(nextTasks) {
        const config = loadGitHubConfig();

        if (config && config.owner && config.repo) {
            try {
                await saveTasksToGitHub(nextTasks, config);
                setSaveError('');
                return;
            } catch (error) {
                const message = error.message || 'GitHub storage write failed. Check your token and repo permissions.';
                setSaveError(message);
                throw error;
            }
        }

        saveLocalTasks(nextTasks);
        setSaveError('');
    }

    useEffect(() => {
        let ignore = false;

        async function loadTasks() {
            setIsLoading(true);

            try {
                const config = loadGitHubConfig();
                const loadedTasks = config && config.owner && config.repo
                    ? await fetchTasksFromGitHub(config)
                    : readLocalTasks();

                if (!ignore) {
                    setTasks(loadedTasks);
                }
            } catch (error) {
                if (!ignore) {
                    setSaveError(error.message || 'Failed to load tasks from GitHub');
                    setTasks(readLocalTasks());
                }
            } finally {
                if (!ignore) {
                    setIsLoading(false);
                }
            }
        }

        loadTasks();
        return () => {
            ignore = true;
        };
    }, []);

    const filteredTasks = useMemo(() => {
        const query = search.trim().toLowerCase();

        return tasks.filter((task) => {
            const matchesText = String(task.description ?? '').toLowerCase().includes(query);
            const matchesStatus =
                status === 'all' ||
                (status === 'active' && !task.completed) ||
                (status === 'completed' && task.completed);

            return matchesText && matchesStatus;
        });
    }, [tasks, search, status]);

    const activeCount = tasks.filter((task) => !task.completed).length;
    const completedCount = tasks.filter((task) => task.completed).length;

    function resetInlineEdit() {
        setEditingId(null);
        setDraftDescription('');
        setDraftScheduledAt('');
    }

    function handleEdit(task) {
        setEditingId(task.id);
        setDraftDescription(task.description);
        setDraftScheduledAt(task.scheduledAt || '');
    }

    async function saveInlineEdit(taskId) {
        const cleanDescription = draftDescription.trim();
        if (!cleanDescription || !draftScheduledAt) {
            return;
        }

        const previousTasks = tasks;
        const nextTasks = tasks.map((task) =>
            task.id === taskId
                ? { ...task, description: cleanDescription, scheduledAt: draftScheduledAt }
                : task,
        );

        setTasks(nextTasks);

        try {
            await persistTasks(nextTasks);
            resetInlineEdit();
        } catch (error) {
            setTasks(previousTasks);
            setSaveError(error.message || 'Failed to save task');
        }
    }

    async function handleDelete(id) {
        const previousTasks = tasks;
        const nextTasks = tasks.filter((task) => task.id !== id);
        setTasks(nextTasks);

        if (editingId === id) {
            resetInlineEdit();
        }

        try {
            await persistTasks(nextTasks);
        } catch (error) {
            setTasks(previousTasks);
            setSaveError(error.message || 'Failed to delete task');
        }
    }

    async function handleToggle(taskId) {
        const previousTasks = tasks;
        const nextTasks = tasks.map((task) =>
            task.id === taskId ? { ...task, completed: !task.completed } : task,
        );

        setTasks(nextTasks);

        try {
            await persistTasks(nextTasks);
        } catch (error) {
            setTasks(previousTasks);
            setSaveError(error.message || 'Failed to update task status');
        }
    }

    return (
        <section className="task-page">
            {saveError && <div className="error-banner">{saveError}</div>}

            <div className="card">
                <div className="section-heading">
                    <h2>Task List</h2>
                    <button type="button" className="primary-btn" onClick={() => navigate('/tasks/new')}>
                        Add New Task
                    </button>
                </div>

                <div className="toolbar">
                    <input
                        type="search"
                        placeholder="Search by description"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />

                    <select value={status} onChange={(event) => setStatus(event.target.value)}>
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>

                <div className="stats-inline">
                    <span>Tasks Status Total</span>
                    <span>:</span>
                    <span>Active = <strong className="count-badge">{activeCount}</strong></span>
                    <span>,</span>
                    <span>Completed = <strong className="count-badge">{completedCount}</strong></span>
                </div>

                <div className="task-list-grid">
                    <div className="task-grid-header">
                        <span>Description</span>
                        <span>Scheduled</span>
                        <span>Status</span>
                        <div className="header-actions">
                            <span>Actions</span>
                            {tasks.length > 0 && (
                                <button
                                    type="button"
                                    className="danger-btn small-btn"
                                    onClick={async () => {
                                        if (!tasks.length) {
                                            return;
                                        }

                                        const confirmed = window.confirm('Delete all tasks?');
                                        if (!confirmed) {
                                            return;
                                        }

                                        setTasks([]);
                                        await persistTasks([]);
                                        resetInlineEdit();
                                    }}
                                >
                                    Clear all
                                </button>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="empty-state">Loading tasks...</div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="empty-state">No tasks match the current filter.</div>
                    ) : (
                        filteredTasks.map((task) => {
                            const isEditing = editingId === task.id;

                            return (
                                <div className="task-grid-row" key={task.id}>
                                    <div className="task-main">
                                        {isEditing ? (
                                            <textarea
                                                className="inline-edit-field"
                                                value={draftDescription}
                                                onChange={(event) => setDraftDescription(event.target.value)}
                                                rows="3"
                                            />
                                        ) : (
                                            <p className="task-description">{task.description}</p>
                                        )}
                                    </div>

                                    <div className="task-scheduled">
                                        {isEditing ? (
                                            <input
                                                type="datetime-local"
                                                className="inline-edit-field"
                                                value={draftScheduledAt}
                                                onChange={(event) => setDraftScheduledAt(event.target.value)}
                                            />
                                        ) : (
                                            <small>{task.scheduledAt || '—'}</small>
                                        )}
                                    </div>

                                    <div className="task-status">
                                        <label className="checkbox-label checkbox-label-strong">
                                            <input
                                                type="checkbox"
                                                checked={task.completed}
                                                onChange={() => handleToggle(task.id)}
                                            />
                                            {task.completed ? 'Done' : 'Open'}
                                        </label>
                                    </div>

                                    <div className="task-controls">
                                        {isEditing ? (
                                            <>
                                                <button type="button" className="primary-btn" onClick={() => saveInlineEdit(task.id)}>
                                                    Save
                                                </button>
                                                <button type="button" className="secondary-btn" onClick={resetInlineEdit}>
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button type="button" className="secondary-btn" onClick={() => handleEdit(task)}>
                                                    Edit
                                                </button>
                                                <button type="button" className="danger-btn" onClick={() => handleDelete(task.id)}>
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </section>
    );
}
