import { useEffect, useMemo, useState } from 'react';
import {
    clearGitHubConfig,
    fetchTasksFromGitHub,
    loadGitHubConfig,
    readLocalTasks,
    saveGitHubConfig,
} from '../services/githubTaskService';

const emptyConfig = {
    owner: '',
    repo: '',
    branch: 'main',
    path: 'tasks.json',
    token: '',
};

export default function SettingsPage() {
    const [config, setConfig] = useState(() => loadGitHubConfig() ?? emptyConfig);
    const [status, setStatus] = useState('Local storage is active');
    const [taskCount, setTaskCount] = useState(readLocalTasks().length);

    useEffect(() => {
        const savedConfig = loadGitHubConfig();
        if (savedConfig && savedConfig.owner && savedConfig.repo) {
            setConfig(savedConfig);
            setStatus('Checking GitHub storage...');

            fetchTasksFromGitHub(savedConfig)
                .then((tasks) => {
                    setTaskCount(tasks.length);
                    setStatus('GitHub storage connected');
                })
                .catch((error) => {
                    setStatus(error.message || 'GitHub storage connection failed');
                    setTaskCount(readLocalTasks().length);
                });
        }
    }, []);

    const storageSummary = useMemo(() => {
        if (config.owner && config.repo) {
            return `${config.owner}/${config.repo}@${config.branch}`;
        }

        return 'Local storage fallback';
    }, [config]);

    function handleChange(event) {
        const { name, value } = event.target;
        setConfig((current) => ({ ...current, [name]: value }));
    }

    async function handleSave(event) {
        event.preventDefault();

        const trimmedConfig = {
            owner: config.owner.trim(),
            repo: config.repo.trim(),
            branch: config.branch.trim() || 'main',
            path: config.path.trim() || 'tasks.json',
            token: config.token.trim(),
        };

        if (!trimmedConfig.owner || !trimmedConfig.repo) {
            clearGitHubConfig();
            setConfig(emptyConfig);
            setTaskCount(readLocalTasks().length);
            setStatus('Local storage is active');
            return;
        }

        try {
            saveGitHubConfig(trimmedConfig);
            setConfig(trimmedConfig);
            const tasks = await fetchTasksFromGitHub(trimmedConfig);
            setTaskCount(tasks.length);
            setStatus('GitHub storage connected');
        } catch (error) {
            setStatus(error.message || 'Unable to connect to GitHub');
        }
    }

    function handleUseLocal() {
        clearGitHubConfig();
        setConfig(emptyConfig);
        setTaskCount(readLocalTasks().length);
        setStatus('Local storage is active');
    }

    return (
        <section className="card settings-page">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Storage</p>
                    <h1>GitHub storage settings</h1>
                </div>
                <span className="status-pill">{status}</span>
            </div>

            <form className="settings-form" onSubmit={handleSave}>
                <div className="settings-grid">
                    <label>
                        GitHub owner
                        <input name="owner" value={config.owner} onChange={handleChange} placeholder="octocat" />
                    </label>

                    <label>
                        Repository
                        <input name="repo" value={config.repo} onChange={handleChange} placeholder="task-manager-data" />
                    </label>

                    <label>
                        Branch
                        <input name="branch" value={config.branch} onChange={handleChange} placeholder="main" />
                    </label>

                    <label>
                        File path
                        <input name="path" value={config.path} onChange={handleChange} placeholder="data/tasks.json" />
                    </label>

                    <label className="full-width">
                        Personal access token
                        <input
                            type="password"
                            name="token"
                            value={config.token}
                            onChange={handleChange}
                            placeholder="Optional if repo is public"
                        />
                    </label>
                </div>

                <div className="actions">
                    <button type="submit" className="primary-btn">Save storage config</button>
                    <button type="button" className="secondary-btn" onClick={handleUseLocal}>Use local storage</button>
                </div>
            </form>

            <div className="storage-summary">
                <div className="summary-card">
                    <span>Current storage</span>
                    <strong>{storageSummary}</strong>
                </div>
                <div className="summary-card">
                    <span>Loaded tasks</span>
                    <strong>{taskCount}</strong>
                </div>
            </div>
        </section>
    );
}
