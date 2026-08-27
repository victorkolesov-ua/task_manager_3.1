import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    fetchTasksFromGitHub,
    loadGitHubConfig,
    readLocalTasks,
    saveLocalTasks,
    saveTasksToGitHub,
} from '../services/githubTaskService';

function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }

    return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AddTaskPage() {
    const navigate = useNavigate();
    const [description, setDescription] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [saveError, setSaveError] = useState('');

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

    async function handleSubmit(event) {
        event.preventDefault();

        const cleanDescription = description.trim();
        if (!cleanDescription || !scheduledAt) {
            return;
        }

        let nextTasks = readLocalTasks();

        const config = loadGitHubConfig();
        if (config && config.owner && config.repo) {
            nextTasks = await fetchTasksFromGitHub(config);
        }

        nextTasks = [
            {
                id: createId(),
                description: cleanDescription,
                scheduledAt,
                completed: false,
            },
            ...nextTasks,
        ];

        try {
            await persistTasks(nextTasks);
            navigate('/tasks');
        } catch (error) {
            setSaveError(error.message || 'Failed to save task to GitHub');
        }
    }

    return (
        <section className="task-page">
            {saveError && <div className="error-banner">{saveError}</div>}

            <form className="card task-form" onSubmit={handleSubmit}>
                <div className="section-heading">
                    <h2>Add New Task</h2>
                    <button type="button" className="secondary-btn" onClick={() => navigate('/tasks')}>
                        Back to Tasks
                    </button>
                </div>

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
                    <button type="submit" className="primary-btn">
                        Save task
                    </button>
                    <button type="button" className="secondary-btn" onClick={() => navigate('/tasks')}>
                        Cancel
                    </button>
                </div>
            </form>
        </section>
    );
}
