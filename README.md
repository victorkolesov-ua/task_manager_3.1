# Task Manager 3

A React + Vite task management app with a small Express API and local JSON storage for task persistence.

## Stack

- React 19
- React Router
- Vite 8
- Express 5
- Node.js
- ESLint + Prettier
- Local JSON file persistence for the API
- Browser localStorage for client-side app state and GitHub config
- GitHub API integration for optional tasks sync via the task service

## App overview

This project is a browser-based task manager with multiple pages for listing, creating, and managing tasks. The frontend is built in React and the backend is a lightweight Express service that serves task data from a JSON file.

The dev setup runs both processes together:

- Frontend: Vite on http://localhost:5173
- API: Express on http://localhost:3000
- Vite proxy forwards /api requests to the backend

## Folder structure

```text
.
├── index.html
├── package.json
├── vite.config.js
├── server.js
├── eslint.config.js
├── tasks.json
├── README.md
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── styles.css
│   ├── components/
│   │   └── Layout.jsx
│   ├── pages/
│   │   ├── AddTaskPage.jsx
│   │   ├── HomePage.jsx
│   │   ├── NotFoundPage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── TasksPage.jsx
│   └── services/
│       └── githubTaskService.js
├── storage/
└── node_modules/
```

## Requirements

- Node.js 18+
- npm

## Install

```bash
npm install
```

## Run the app

Start both the Express API and the Vite frontend together:

```bash
npm run dev
```

Then open:

```text
http://localhost:5173
```

The app will talk to the backend at:

```text
http://localhost:3000/api
```

### Useful scripts

```bash
# Start only the API server
npm run server

# Run the frontend only
npx vite --host

# Build the production frontend bundle
npm run build

# Preview production build locally
npm run preview

# Lint the project
npm run lint
```

## API

The backend is defined in [server.js](server.js) and exposes these endpoints:

- GET /api/health
- GET /api/tasks
- POST /api/tasks

The tasks are stored in [tasks.json](tasks.json), and the server creates it automatically if it does not exist.

## Notes

- The frontend uses React Router for page navigation.
- The app stores local task data in browser storage as well as optional GitHub configuration through the service in [src/services/githubTaskService.js](src/services/githubTaskService.js).
- The dev server is configured in [vite.config.js](vite.config.js) to proxy /api requests to the Express backend on port 3000.
