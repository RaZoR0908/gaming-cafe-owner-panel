import axios from 'axios';

const API_URL = 'http://localhost:5000/api/cafes/';

// Helper function to get the user's token from local storage
const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.token) {
    return { Authorization: `Bearer ${user.token}` };
  } else {
    return {};
  }
};

// Fetches all cafes (public)
const getAllCafes = () => {
  return axios.get(API_URL);
};

// Fetches the logged-in owner's cafe (protected)
const getMyCafe = async () => {
  const config = { headers: getAuthHeader() };
  const response = await axios.get(API_URL + 'my-cafe', config);
  return response.data;
};

// Creates a new cafe (protected)
const createCafe = async (cafeData) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.post(API_URL, cafeData, config);
  return response.data;
};

// Gets a single cafe's details by its ID (public)
const getCafeById = (id) => {
  return axios.get(API_URL + id);
};

// Updates a cafe's details (protected)
const updateCafe = async (id, cafeData) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.put(API_URL + id, cafeData, config);
  return response.data;
};

// ADD THIS NEW FUNCTION
// Deletes a cafe (protected)
const deleteCafe = async (id) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.delete(API_URL + id, config);
  return response.data;
};


const cafeService = {
  getAllCafes,
  getMyCafe,
  createCafe,
  getCafeById,
  updateCafe,
  deleteCafe, // Add the new function
};

export default cafeService;
