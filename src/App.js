import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import our pages and the new ProtectedRoute component
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage';
import CreateCafePage from './pages/CreateCafePage'; // 1. Import the new page
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
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          {/* 2. Add the new protected route for creating a cafe */}
          <Route
            path="/create-cafe"
            element={
              <ProtectedRoute>
                <CreateCafePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
