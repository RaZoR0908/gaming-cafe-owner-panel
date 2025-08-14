import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage';
import CreateCafePage from './pages/CreateCafePage';
import EditCafePage from './pages/EditCafePage'; // 1. Import the new page
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
          />
          <Route
            path="/create-cafe"
            element={<ProtectedRoute><CreateCafePage /></ProtectedRoute>}
          />
          {/* 2. Add the new protected route for editing a cafe */}
          {/* Notice the ':id' which makes the route dynamic */}
          <Route
            path="/edit-cafe/:id"
            element={<ProtectedRoute><EditCafePage /></ProtectedRoute>}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
