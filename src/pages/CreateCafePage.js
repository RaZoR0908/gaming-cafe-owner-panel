import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './CreateCafePage.css';
import cafeService from '../services/cafeService';

const CreateCafePage = () => {
  // 1. Set up state for all the form fields
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    openingTime: '10:00',
    closingTime: '22:00',
    longitude: '',
    latitude: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 2. A handler to update state as the user types
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // 3. The function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Prepare the data in the format our backend expects
    const cafeData = {
      name: formData.name,
      address: formData.address,
      openingTime: formData.openingTime,
      closingTime: formData.closingTime,
      location: {
        type: 'Point',
        coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
      },
      // We will add rooms and photos later
      rooms: [], 
    };

    try {
      // Call the createCafe function from our service
      await cafeService.createCafe(cafeData);
      // If successful, navigate back to the dashboard
      navigate('/dashboard');
    } catch (err) {
      const errorMessage =
        (err.response && err.response.data && err.response.data.message) ||
        'Failed to create cafe. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* A simple navbar */}
      <nav style={{ backgroundColor: '#333', padding: '15px 30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Owner Panel</span>
        <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Back to Dashboard</Link>
      </nav>
      <div className="create-cafe-container">
        <h1 className="title">Create Your Cafe</h1>
        <form onSubmit={handleSubmit}>
          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
          
          <div className="input-group full-width">
            <label htmlFor="name" className="label">Cafe Name</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="input" required />
          </div>

          <div className="input-group full-width">
            <label htmlFor="address" className="label">Full Address</label>
            <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} className="input" required />
          </div>

          <div className="form-grid">
            <div className="input-group">
              <label htmlFor="openingTime" className="label">Opening Time</label>
              <input type="time" id="openingTime" name="openingTime" value={formData.openingTime} onChange={handleChange} className="input" required />
            </div>
            <div className="input-group">
              <label htmlFor="closingTime" className="label">Closing Time</label>
              <input type="time" id="closingTime" name="closingTime" value={formData.closingTime} onChange={handleChange} className="input" required />
            </div>
            <div className="input-group">
              <label htmlFor="longitude" className="label">Longitude (Temporary)</label>
              <input type="number" step="any" id="longitude" name="longitude" value={formData.longitude} onChange={handleChange} className="input" required />
            </div>
            <div className="input-group">
              <label htmlFor="latitude" className="label">Latitude (Temporary)</label>
              <input type="number" step="any" id="latitude" name="latitude" value={formData.latitude} onChange={handleChange} className="input" required />
            </div>
          </div>

          <button type="submit" className="button full-width" disabled={loading}>
            {loading ? 'Creating Cafe...' : 'Create Cafe'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateCafePage;
