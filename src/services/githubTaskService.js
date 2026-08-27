const STORAGE_KEY = 'task-manager-github-config';

function safeParse(raw) {
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function loadGitHubConfig() {
    return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function saveGitHubConfig(config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearGitHubConfig() {
    localStorage.removeItem(STORAGE_KEY);
}

export function readLocalTasks() {
    const raw = localStorage.getItem('task-manager-3-1');
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveLocalTasks(tasks) {
    localStorage.setItem('task-manager-3-1', JSON.stringify(tasks));
}

function toBase64(value) {
    return btoa(
        Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join(''),
    );
}

function fromBase64(value) {
    const binary = atob(value.replace(/\s/g, ''));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

async function parseGitHubError(response, operation) {
    const rawText = await response.text();

    try {
        const parsed = JSON.parse(rawText);
        const message = parsed.message || parsed.error || rawText || 'Unknown GitHub error';
        return `${operation} failed (${response.status}): ${message}`;
    } catch {
        return `${operation} failed (${response.status}): ${rawText || 'Unknown GitHub error'}`;
    }
}

export function buildGitHubFileUrl({ owner, repo, branch = 'main', path = 'tasks.json' }) {
    return `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
}

export async function fetchTasksFromGitHub(config) {
    const { owner, repo, branch = 'main', path = 'tasks.json', token } = config || {};

    if (!owner || !repo) {
        return [];
    }

    const response = await fetch(buildGitHubFileUrl({ owner, repo, branch, path }), {
        headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (response.status === 404) {
        return [];
    }

    if (!response.ok) {
        throw new Error(await parseGitHubError(response, 'GitHub read'));
    }

    const payload = await response.json();

    if (!payload.content) {
        return [];
    }

    const parsed = JSON.parse(fromBase64(payload.content));
    return Array.isArray(parsed) ? parsed : [];
}

export async function saveTasksToGitHub(tasks, config) {
    const { owner, repo, branch = 'main', path = 'tasks.json', token } = config || {};

    if (!owner || !repo) {
        return tasks;
    }

    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const payload = JSON.stringify(tasks, null, 2);
    const encodedContent = toBase64(payload);

    const existing = await fetch(`${fileUrl}?ref=${encodeURIComponent(branch)}`, {
        headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    let sha = null;
    if (existing.ok) {
        const fileData = await existing.json();
        sha = fileData?.sha ?? null;
    }

    const response = await fetch(fileUrl, {
        method: 'PUT',
        headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            message: 'Update tasks via task manager',
            branch,
            content: encodedContent,
            ...(sha ? { sha } : {}),
        }),
    });

    if (!response.ok) {
        throw new Error(await parseGitHubError(response, 'GitHub write'));
    }

    return tasks;
}
