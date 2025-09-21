import axios from "axios";

// The base URL of our backend API
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// This function sends a POST request to the login endpoint
const login = (email, password) => {
  return axios.post(API_URL + "/auth/login", {
    email,
    password,
  });
};

// ADD THIS NEW FUNCTION
// This function sends a POST request to the owner registration endpoint
const registerOwner = (name, email, password) => {
  return axios.post(API_URL + "/auth/register-owner", {
    name,
    email,
    password,
  });
};

// Generic register function that handles different user types
const register = (userData) => {
  const { fullName, email, password, role = "cafeOwner" } = userData;

  if (role === "cafeOwner") {
    return axios.post(API_URL + "/auth/register-owner", {
      name: fullName,
      email,
      password,
    });
  } else {
    // For other user types, use a generic register endpoint
    return axios.post(API_URL + "/auth/register", {
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
