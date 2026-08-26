export default function HomePage() {
    return (
        <section className="card home-page">
            <p className="eyebrow">Dashboard</p>
            <h1>Welcome to Task Manager 3.1</h1>
            <p>
                This version is structured around route-based screens and a GitHub-backed storage layer.
                Use the navigation to manage tasks and storage settings.
            </p>

            <div className="home-grid">
                <div className="feature-card">
                    <h2>Tasks</h2>
                    <p>Create, edit, search, filter, and track task completion.</p>
                </div>
                <div className="feature-card">
                    <h2>Storage</h2>
                    <p>Connect to a GitHub repository or use the local fallback.</p>
                </div>
                <div className="feature-card">
                    <h2>Routing</h2>
                    <p>Navigate between Home, Tasks, and Settings with React Router.</p>
                </div>
            </div>
        </section>
    );
}
