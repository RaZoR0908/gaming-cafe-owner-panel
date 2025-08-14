import { Navigate } from 'react-router-dom';

// This component acts as a guard for our private routes.
const ProtectedRoute = ({ children }) => {
  // 1. Check for user data in local storage.
  const user = JSON.parse(localStorage.getItem('user'));

  // 2. If there is no user data, it means the user is not logged in.
  //    Redirect them to the login page ('/').
  if (!user) {
    return <Navigate to="/" />;
  }

  // 3. If there IS user data, it means they are logged in.
  //    Render the child component (e.g., the DashboardPage).
  return children;
};

export default ProtectedRoute;
