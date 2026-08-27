import { NavLink } from 'react-router-dom';

export default function Layout({ children }) {
    return (
        <div className="app-shell">
            <header className="topbar">
                <div className="brand">Task Manager 3.1</div>

                <nav className="nav" aria-label="Main navigation">
                    <NavLink
                        to="/"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Home
                    </NavLink>
                    <NavLink
                        to="/tasks"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Tasks
                    </NavLink>
                    <NavLink
                        to="/tasks/new"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Add New Task
                    </NavLink>
                    <NavLink
                        to="/settings"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Settings
                    </NavLink>
                </nav>
            </header>

            <main className="page">{children}</main>
        </div>
    );
}
