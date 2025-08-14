import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import './EditCafePage.css';
import cafeService from '../services/cafeService';

const EditCafePage = () => {
  // 1. Get the cafe ID from the URL using the useParams hook
  const { id } = useParams();
  const navigate = useNavigate();

  // 2. Set up state for the form fields
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    openingTime: '',
    closingTime: '',
    longitude: '',
    latitude: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 3. Fetch the cafe's current data when the component loads
  useEffect(() => {
    const fetchCafe = async () => {
      try {
        const response = await cafeService.getCafeById(id);
        const cafe = response.data;
        // Pre-fill the form with the fetched data
        setFormData({
          name: cafe.name,
          address: cafe.address,
          openingTime: cafe.openingTime,
          closingTime: cafe.closingTime,
          longitude: cafe.location.coordinates[0],
          latitude: cafe.location.coordinates[1],
        });
      } catch (err) {
        setError('Failed to fetch cafe details.');
      } finally {
        setLoading(false);
      }
    };
    fetchCafe();
  }, [id]); // The effect depends on the cafe ID

  // 4. A handler to update state as the user types
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // 5. The function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const updatedCafeData = {
      name: formData.name,
      address: formData.address,
      openingTime: formData.openingTime,
      closingTime: formData.closingTime,
      location: {
        type: 'Point',
        coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
      },
    };

    try {
      await cafeService.updateCafe(id, updatedCafeData);
      navigate('/dashboard'); // Redirect to dashboard on success
    } catch (err) {
      setError('Failed to update cafe. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div>Loading cafe details...</div>;

  return (
    <div>
      <nav style={{ backgroundColor: '#333', padding: '15px 30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Owner Panel</span>
        <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Back to Dashboard</Link>
      </nav>
      <div className="edit-cafe-container">
        <h1 className="title">Edit Your Cafe</h1>
        <form onSubmit={handleSubmit}>
          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
          
          {/* Form fields are the same as the create page */}
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
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditCafePage;
