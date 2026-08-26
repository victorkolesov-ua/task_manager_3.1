import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TASKS_FILE = path.join(__dirname, 'tasks.json');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get('/', (_req, res) => {
    res.json({
        ok: true,
        service: 'task-manager-api',
        storage: 'local-json',
        endpoints: ['/api/health', '/api/tasks'],
    });
});

async function readTasks() {
    try {
        const data = await fs.readFile(TASKS_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.writeFile(TASKS_FILE, '[]', 'utf-8');
            return [];
        }

        throw error;
    }
}

async function writeTasks(tasks) {
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

app.get('/api/health', (_req, res) => {
    res.json({ ok: true, storage: 'local-json' });
});

app.get('/api/tasks', async (_req, res) => {
    try {
        const tasks = await readTasks();
        res.json(tasks);
    } catch (error) {
        console.error('Failed to read tasks:', error);
        res.status(500).json({ error: 'Failed to read tasks' });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const tasks = Array.isArray(req.body) ? req.body : [];
        await writeTasks(tasks);
        res.json(tasks);
    } catch (error) {
        console.error('Failed to save tasks:', error);
        res.status(500).json({ error: 'Failed to save tasks' });
    }
});

app.listen(PORT, () => {
    console.log(`Health server running on http://localhost:${PORT}`);
});
