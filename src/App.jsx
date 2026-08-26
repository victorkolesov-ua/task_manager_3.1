import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import TasksPage from './pages/TasksPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </Layout>
    );
}
