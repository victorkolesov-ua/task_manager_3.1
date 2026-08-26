import { useEffect, useMemo, useState } from 'react';
import {
    clearGitHubConfig,
    fetchTasksFromGitHub,
    loadGitHubConfig,
    readLocalTasks,
    saveGitHubConfig,
    saveLocalTasks,
    saveTasksToGitHub,
} from '../services/githubTaskService';

const emptyConfig = {
    owner: '',
    repo: '',
    branch: 'main',
    path: 'tasks.json',
    token: '',
};

function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }

    return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function TasksPage() {
    const [tasks, setTasks] = useState([]);
    const [description, setDescription] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [editingId, setEditingId] = useState(null);
    const [githubConfig, setGithubConfig] = useState(() => loadGitHubConfig() ?? emptyConfig);
    const [saveError, setSaveError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    async function persistTasks(nextTasks) {
        const config = loadGitHubConfig();

        if (config && config.owner && config.repo) {
            await saveTasksToGitHub(nextTasks, config);
            setSaveError('');
            return;
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
                    setGithubConfig(config ?? emptyConfig);
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

    async function handleStorageConfigSubmit(event) {
        event.preventDefault();

        const trimmedConfig = {
            owner: githubConfig.owner.trim(),
            repo: githubConfig.repo.trim(),
            branch: githubConfig.branch.trim() || 'main',
            path: githubConfig.path.trim() || 'tasks.json',
            token: githubConfig.token.trim(),
        };

        if (!trimmedConfig.owner || !trimmedConfig.repo) {
            clearGitHubConfig();
            setGithubConfig(emptyConfig);
            setTasks(readLocalTasks());
            return;
        }

        saveGitHubConfig(trimmedConfig);
        setGithubConfig(trimmedConfig);

        try {
            const loadedTasks = await fetchTasksFromGitHub(trimmedConfig);
            setTasks(loadedTasks);
            setSaveError('');
        } catch (error) {
            setSaveError(error.message || 'Unable to connect to GitHub');
        }
    }

    function handleConfigChange(event) {
        const { name, value } = event.target;
        setGithubConfig((current) => ({ ...current, [name]: value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const cleanDescription = description.trim();
        if (!cleanDescription || !scheduledAt) {
            return;
        }

        let nextTasks;

        if (editingId) {
            nextTasks = tasks.map((task) =>
                task.id === editingId
                    ? { ...task, description: cleanDescription, scheduledAt }
                    : task,
            );
            setEditingId(null);
        } else {
            nextTasks = [
                {
                    id: createId(),
                    description: cleanDescription,
                    scheduledAt,
                    completed: false,
                },
                ...tasks,
            ];
        }

        setTasks(nextTasks);
        await persistTasks(nextTasks);
        setDescription('');
        setScheduledAt('');
    }

    async function handleEdit(task) {
        setEditingId(task.id);
        setDescription(task.description);
        setScheduledAt(task.scheduledAt);
    }

    async function handleDelete(id) {
        const nextTasks = tasks.filter((task) => task.id !== id);
        setTasks(nextTasks);

        if (editingId === id) {
            setEditingId(null);
            setDescription('');
            setScheduledAt('');
        }

        await persistTasks(nextTasks);
    }

    async function handleToggle(taskId) {
        const nextTasks = tasks.map((task) =>
            task.id === taskId ? { ...task, completed: !task.completed } : task,
        );

        setTasks(nextTasks);
        await persistTasks(nextTasks);
    }

    return (
        <section className="task-page">
            <form className="card task-form" onSubmit={handleStorageConfigSubmit}>
                <h2>GitHub storage</h2>

                <div className="storage-grid">
                    <label>
                        GitHub owner
                        <input name="owner" value={githubConfig.owner} onChange={handleConfigChange} placeholder="octocat" />
                    </label>

                    <label>
                        Repository
                        <input name="repo" value={githubConfig.repo} onChange={handleConfigChange} placeholder="task-manager-data" />
                    </label>

                    <label>
                        Branch
                        <input name="branch" value={githubConfig.branch} onChange={handleConfigChange} placeholder="main" />
                    </label>

                    <label>
                        File path
                        <input name="path" value={githubConfig.path} onChange={handleConfigChange} placeholder="data/tasks.json" />
                    </label>

                    <label className="full-width">
                        Personal access token
                        <input
                            type="password"
                            name="token"
                            value={githubConfig.token}
                            onChange={handleConfigChange}
                            placeholder="Optional if repo is public"
                        />
                    </label>
                </div>

                <div className="actions">
                    <button type="submit" className="primary-btn">Save GitHub config</button>
                    <button type="button" className="secondary-btn" onClick={() => {
                        clearGitHubConfig();
                        setGithubConfig(emptyConfig);
                        setTasks(readLocalTasks());
                        setSaveError('');
                    }}>
                        Use local storage
                    </button>
                </div>
            </form>

            {saveError && <div className="error-banner">{saveError}</div>}

            <form className="card task-form" onSubmit={handleSubmit}>
                <h2>{editingId ? 'Edit task' : 'Add task'}</h2>

                <label>
                    Description
                    <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        rows="3"
                        placeholder="Task description"
                        required
                    />
                </label>

                <label>
                    Date and time
                    <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(event) => setScheduledAt(event.target.value)}
                        required
                    />
                </label>

                <div className="actions">
                    <button type="submit" className="primary-btn" disabled={isLoading}>
                        {editingId ? 'Save changes' : 'Add task'}
                    </button>

                    {editingId && (
                        <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => {
                                setEditingId(null);
                                setDescription('');
                                setScheduledAt('');
                            }}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            <div className="card">
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

                <div className="stats">
                    <div className="stat">
                        <span>Active</span>
                        <strong>{activeCount}</strong>
                    </div>
                    <div className="stat">
                        <span>Completed</span>
                        <strong>{completedCount}</strong>
                    </div>
                </div>

                <div className="task-list">
                    {isLoading ? (
                        <div className="empty-state">Loading tasks...</div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="empty-state">No tasks match the current filter.</div>
                    ) : (
                        filteredTasks.map((task) => (
                            <div className="task-row" key={task.id}>
                                <div className="task-main">
                                    <p className="task-description">{task.description}</p>
                                    <small>{task.scheduledAt}</small>
                                </div>

                                <div className="task-controls">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={task.completed}
                                            onChange={() => handleToggle(task.id)}
                                        />
                                        Done
                                    </label>

                                    <button type="button" className="secondary-btn" onClick={() => handleEdit(task)}>
                                        Edit
                                    </button>

                                    <button type="button" className="danger-btn" onClick={() => handleDelete(task.id)}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
