import axios from 'axios';

const CAFE_API_URL = 'http://localhost:5000/api/cafes/';
const BOOKING_API_URL = 'http://localhost:5000/api/bookings/';

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
  return axios.get(CAFE_API_URL);
};

// Fetches the logged-in owner's cafe (protected)
const getMyCafe = async () => {
  const config = { headers: getAuthHeader() };
  const response = await axios.get(CAFE_API_URL + 'my-cafe', config);
  return response.data;
};

// Creates a new cafe (protected)
const createCafe = async (cafeData) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.post(CAFE_API_URL, cafeData, config);
  return response.data;
};

// Gets a single cafe's details by its ID (public)
const getCafeById = (id) => {
  return axios.get(CAFE_API_URL + id);
};

// Updates a cafe's details (protected)
const updateCafe = async (id, cafeData) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.put(CAFE_API_URL + id, cafeData, config);
  return response.data;
};

// Deletes a cafe (protected)
const deleteCafe = async (id) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.delete(CAFE_API_URL + id, config);
  return response.data;
};

// Fetches all bookings for a specific cafe (protected)
const getOwnerBookings = async (cafeId) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.get(
    BOOKING_API_URL + 'owner/' + cafeId,
    config
  );
  return response.data;
};

// Updates a booking's status (protected)
const updateBookingStatus = async (bookingId, status) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.put(
    BOOKING_API_URL + bookingId,
    { status },
    config
  );
  return response.data;
};

// --- UPDATED FUNCTION ---
// Extends a booking's duration (protected)
const extendBooking = async (bookingId, hoursToAdd) => {
  const config = { headers: getAuthHeader() };
  // FIX: Change from axios.put to axios.patch to match the backend route
  const response = await axios.patch(
    BOOKING_API_URL + bookingId + '/extend',
    { hoursToAdd },
    config
  );
  return response.data;
};


const cafeService = {
  getAllCafes,
  getMyCafe,
  createCafe,
  getCafeById,
  updateCafe,
  deleteCafe,
  getOwnerBookings,
  updateBookingStatus,
  extendBooking,
};

export default cafeService;
