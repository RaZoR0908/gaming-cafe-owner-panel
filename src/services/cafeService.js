import axios from 'axios';

const API_URL = 'http://localhost:5000/api/cafes/';

// This function will fetch all cafes (public)
const getAllCafes = () => {
  return axios.get(API_URL);
};

// Fetches the logged-in owner's cafe (protected)
const getMyCafe = async () => {
  // 1. Get the user data from local storage.
  const user = JSON.parse(localStorage.getItem('user'));

  // 2. Safety check: if there's no user or token, we can't proceed.
  if (!user || !user.token) {
    throw new Error('Not authorized, no token found');
  }

  // 3. Create the configuration object for our API call.
  //    This is where we add the all-important Authorization header.
  const config = {
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
  };

  // 4. Make the authenticated GET request to our new backend endpoint.
  const response = await axios.get(API_URL + 'my-cafe', config);

  // 5. Return the data from the backend.
  return response.data;
};

// ADD THIS NEW FUNCTION
// Creates a new cafe (protected)
const createCafe = async (cafeData) => {
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user || !user.token) {
    throw new Error('Not authorized, no token found');
  }

  const config = {
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
  };

  // Make the authenticated POST request to create the cafe.
  const response = await axios.post(API_URL, cafeData, config);
  return response.data;
};


const cafeService = {
  getAllCafes,
  getMyCafe,
  createCafe, // Add the new function here
};

export default cafeService;
