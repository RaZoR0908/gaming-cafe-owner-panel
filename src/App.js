import './App.css';
// 1. Import the necessary components from react-router-dom
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// 2. Import the page components we have created
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage'; // Import the new RegisterPage

function App() {
  return (
    // 3. Wrap our entire application in the Router component
    <Router>
      <div>
        {/* The Routes component will manage all our different routes */}
        <Routes>
          {/* 4. Define our routes. */}
          {/* This says: when the URL is exactly '/', show the LoginPage component. */}
          <Route path="/" element={<LoginPage />} />

          {/* This says: when the URL is '/register', show the RegisterPage component. */}
          <Route path="/register" element={<RegisterPage />} />

          {/* This says: when the URL is '/dashboard', show the DashboardPage component. */}
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
