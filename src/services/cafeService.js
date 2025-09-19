import axios from 'axios';

const CAFE_API_URL = 'http://localhost:5000/api/cafes/';
const BOOKING_API_URL = 'http://localhost:5000/api/bookings/';
const REVIEW_API_URL = 'http://localhost:5000/api/reviews/';

// Helper function to get the user's token from local storage
const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.token) {
    return { Authorization: `Bearer ${user.token}` };
  } else {
    return {};
  }
};

// --- Cafe Functions ---
const getAllCafes = () => {
  return axios.get(CAFE_API_URL);
};
const getMyCafe = async () => {
  const config = { headers: getAuthHeader() };
  const response = await axios.get(CAFE_API_URL + 'my-cafe', config);
  return response.data;
};
const createCafe = async (cafeData) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.post(CAFE_API_URL, cafeData, config);
  return response.data;
};
const getCafeById = (id) => {
  return axios.get(CAFE_API_URL + id);
};
const updateCafe = async (id, cafeData) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.put(CAFE_API_URL + id, cafeData, config);
  return response.data;
};
const deleteCafe = async (id) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.delete(CAFE_API_URL + id, config);
  return response.data;
};

const toggleCafeStatus = async (id) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.patch(CAFE_API_URL + id + '/toggle-status', {}, config);
  return response.data;
};

// --- Booking Functions ---
const getOwnerBookings = async (cafeId) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.get(BOOKING_API_URL + 'owner/' + cafeId, config);
  return response.data;
};
const updateBookingStatus = async (bookingId, status) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.put(BOOKING_API_URL + bookingId, { status }, config);
  return response.data;
};
const extendBooking = async (bookingId, hoursToAdd) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.patch(BOOKING_API_URL + bookingId + '/extend', { hoursToAdd }, config);
  return response.data;
};

// Creates a new walk-in booking (protected)
const createWalkInBooking = async (bookingData) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.post(
    BOOKING_API_URL + 'walk-in',
    bookingData,
    config
  );
  return response.data;
};
const getOwnerReviews = async () => {
  const config = { headers: getAuthHeader() };
  const response = await axios.get(REVIEW_API_URL + 'my-cafe/all', config);
  return response.data;
};



// --- NEW SYSTEM MANAGEMENT FUNCTIONS ---
const assignSystemsAndStartSession = async (bookingId, systemAssignments) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.post(
    BOOKING_API_URL + 'assign-systems',
    { bookingId, systemAssignments },
    config
  );
  return response.data;
};

const endSession = async (bookingId) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.post(
    BOOKING_API_URL + 'end-session',
    { bookingId },
    config
  );
  return response.data;
};

const getAvailableSystemsForAssignment = async (cafeId, roomTypes, systemTypes) => {
  const config = { headers: getAuthHeader() };
  const params = new URLSearchParams();
  if (roomTypes) params.append('roomTypes', roomTypes.join(','));
  if (systemTypes) params.append('systemTypes', systemTypes.join(','));
  
  const response = await axios.get(
    `${BOOKING_API_URL}available-systems/${cafeId}?${params.toString()}`,
    config
  );
  return response.data;
};

const autoCompleteExpiredSessions = async () => {
  const config = { headers: getAuthHeader() };
  const response = await axios.post(
    BOOKING_API_URL + 'auto-complete-sessions',
    {},
    config
  );
  return response.data;
};

const updateSystemMaintenanceStatus = async (cafeId, roomName, systemId, status) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.patch(
    BOOKING_API_URL + 'system-maintenance',
    { cafeId, roomName, systemId, status },
    config
  );
  return response.data;
};

const verifyOTP = async (bookingId, otp) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.post(
    BOOKING_API_URL + 'verify-otp-only',
    { bookingId, otp },
    config
  );
  return response.data;
};

const verifyOTPAndStartSession = async (bookingId, otp, systemAssignments) => {
  const config = { headers: getAuthHeader() };
  const response = await axios.post(
    BOOKING_API_URL + 'verify-otp',
    { bookingId, otp, systemAssignments },
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
  toggleCafeStatus,
  getOwnerBookings,
  updateBookingStatus,
  extendBooking,
  createWalkInBooking,
  getOwnerReviews,
  assignSystemsAndStartSession,
  endSession,
  getAvailableSystemsForAssignment,
  autoCompleteExpiredSessions,
  updateSystemMaintenanceStatus,
  verifyOTP,
  verifyOTPAndStartSession,
};

export default cafeService;
