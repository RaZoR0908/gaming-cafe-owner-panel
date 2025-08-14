import axios from 'axios';

// The base URL of our backend API
const API_URL = 'http://localhost:5000/api/auth/';

// This function sends a POST request to the login endpoint
const login = (email, password) => {
  return axios.post(API_URL + 'login', {
    email,
    password,
  });
};

// ADD THIS NEW FUNCTION
// This function sends a POST request to the owner registration endpoint
const registerOwner = (name, email, password) => {
  return axios.post(API_URL + 'register-owner', {
    name,
    email,
    password,
  });
};


const authService = {
  login,
  registerOwner, // Add the new function to the exported object
};

export default authService;
