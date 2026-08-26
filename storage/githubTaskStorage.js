const DEFAULT_BRANCH = 'main';
const DEFAULT_PATH = 'tasks.json';

export function getGitHubStorageConfig() {
    const owner = process.env.GITHUB_OWNER?.trim();
    const repo = process.env.GITHUB_REPO?.trim();
    const branch = process.env.GITHUB_BRANCH?.trim() || DEFAULT_BRANCH;
    const path = process.env.GITHUB_PATH?.trim() || DEFAULT_PATH;
    const token = process.env.GITHUB_TOKEN?.trim();

    return {
        owner,
        repo,
        branch,
        path,
        token,
        enabled: Boolean(owner && repo),
    };
}

function buildHeaders(token) {
    return {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export async function readTasksFromGitHub() {
    const { owner, repo, branch, path, token, enabled } = getGitHubStorageConfig();

    if (!enabled) {
        return null;
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(token),
    });

    if (response.status === 404) {
        return [];
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub GET failed (${response.status}): ${errorText}`);
    }

    const payload = await response.json();

    if (!payload.content) {
        return [];
    }

    const rawContent = Buffer.from(payload.content, 'base64').toString('utf-8');
    const parsed = JSON.parse(rawContent);

    return Array.isArray(parsed) ? parsed : [];
}

export async function writeTasksToGitHub(tasks) {
    const { owner, repo, branch, path, token, enabled } = getGitHubStorageConfig();

    if (!enabled) {
        return null;
    }

    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const content = JSON.stringify(tasks, null, 2);
    const encodedContent = Buffer.from(content, 'utf-8').toString('base64');

    const headers = buildHeaders(token);
    let sha = null;

    const currentResponse = await fetch(fileUrl, {
        method: 'GET',
        headers,
    });

    if (currentResponse.ok) {
        const currentFile = await currentResponse.json();
        sha = currentFile?.sha ?? null;
    }

    if (currentResponse.status !== 200 && currentResponse.status !== 404) {
        const errorText = await currentResponse.text();
        throw new Error(`GitHub lookup failed (${currentResponse.status}): ${errorText}`);
    }

    const response = await fetch(fileUrl, {
        method: 'PUT',
        headers: {
            ...headers,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: `Update tasks in ${path}`,
            content: encodedContent,
            branch,
            ...(sha ? { sha } : {}),
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub PUT failed (${response.status}): ${errorText}`);
    }

    return tasks;
}
