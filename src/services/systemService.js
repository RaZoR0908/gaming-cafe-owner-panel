import axios from 'axios';

// Dynamic URL configuration for mobile access
const getBaseURL = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  return `http://${window.location.hostname}:5000`;
};

// The base URL for all system-related API calls.
const API_URL = `${getBaseURL()}/api/systems`;

// Helper function to retrieve the user's authentication token from local storage.
const getToken = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user ? user.token : null;
};

// Helper function to create the authorization headers.
const getConfig = () => ({
    headers: {
        Authorization: `Bearer ${getToken()}`,
    },
});

/**
 * Gets real-time system availability for a cafe
 * @param {string} cafeId - The ID of the cafe to get availability for.
 * @returns {Promise<object>} An object containing availability data and active sessions.
 */
const getSystemAvailability = async (cafeId) => {
    const response = await axios.get(
        `${API_URL}/availability/${cafeId}`,
        getConfig()
    );
    return response.data.data;
};

/**
 * Starts a session for a given booking by assigning specific systems.
 * @param {string} bookingId - The ID of the booking to start.
 * @param {string[]} systemIds - An array of system IDs to assign (e.g., ['PC01', 'PS502']).
 * @returns {Promise<object>} An object containing the updated booking and cafe data.
 */
const startSession = async (bookingId, systemIds) => {
    const response = await axios.post(
        `${API_URL}/start-session`,
        { bookingId, systemIds },
        getConfig()
    );
    return response.data.data;
};

/**
 * Ends an active session for a given booking.
 * @param {string} bookingId - The ID of the active booking to end.
 * @returns {Promise<object>} An object containing the updated booking and cafe data.
 */
const endSession = async (bookingId) => {
    const response = await axios.post(
        `${API_URL}/end-session`,
        { bookingId },
        getConfig()
    );
    return response.data.data;
};

/**
 * Updates a system's status for maintenance purposes.
 * @param {string} systemId - The unique ID of the system to update.
 * @param {string} status - The new status ('Under Maintenance' or 'Available').
 * @returns {Promise<object>} The full, updated cafe object.
 */
const updateSystemMaintenanceStatus = async (systemId, status) => {
    const response = await axios.patch(
        `${API_URL}/${systemId}/maintenance`,
        { status },
        getConfig()
    );
    return response.data.data;
};

/**
 * Extends a specific system session within a booking
 */
const extendSystemSession = async (bookingId, systemId, hoursToAdd) => {
    const response = await axios.patch(
        `${API_URL}/extend`,
        { bookingId, systemId, hoursToAdd },
        getConfig()
    );
    return response.data.data;
};


const systemService = {
    getSystemAvailability,
    startSession,
    endSession,
    updateSystemMaintenanceStatus,
    extendSystemSession,
};

export default systemService;
