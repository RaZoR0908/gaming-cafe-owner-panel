import axios from "axios";

// The base URL of our backend API
// Use the computer's IP address for mobile access, fallback to localhost for development
const getBaseURL = () => {
  // Check if we're running on localhost (development)
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://localhost:5000/api/auth/";
  }
  // For mobile access, use the same IP as the frontend
  return `http://${window.location.hostname}:5000/api/auth/`;
};

const API_URL = getBaseURL();

// This function sends a POST request to the login endpoint
const login = (email, password) => {
  return axios.post(API_URL + "login", {
    email,
    password,
  });
};

// ADD THIS NEW FUNCTION
// This function sends a POST request to the owner registration endpoint
const registerOwner = (name, email, password) => {
  return axios.post(API_URL + "register-owner", {
    name,
    email,
    password,
  });
};

// Generic register function that handles different user types
const register = (userData) => {
  const { fullName, email, password, role = "cafeOwner" } = userData;

  if (role === "cafeOwner") {
    return axios.post(API_URL + "register-owner", {
      name: fullName,
      email,
      password,
    });
  } else {
    // For other user types, use a generic register endpoint
    return axios.post(API_URL + "register", {
      fullName,
      email,
      password,
      role,
    });
  }
};

const authService = {
  login,
  registerOwner,
  register, // Add the generic register function
};

export default authService;
