// client/src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [myTrips, setMyTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile Edit Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    transport: user?.defaultPreferences?.transport || 'train',
    food: user?.defaultPreferences?.food || 'veg'
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchMyTrips = async () => {
      try {
        const { data } = await axios.get('/trips/my-trips');
        setMyTrips(data);
      } catch (error) {
        console.error("Failed to fetch trips");
      } finally {
        setLoading(false);
      }
    };
    fetchMyTrips();
  }, []);

  const handleDeleteTrip = async (e, tripId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this trip? This cannot be undone.")) {
      try {
        await axios.delete(`/trips/${tripId}`);
        setMyTrips(myTrips.filter(t => t._id !== tripId));
      } catch (err) {
        alert("Failed to delete trip");
      }
    }
  };

  const handleEditTrip = async (e, trip) => {
    e.stopPropagation();
    const newTitle = window.prompt("Enter new title for your trip:", trip.title);
    if (!newTitle || newTitle === trip.title) return;
    try {
      const { data } = await axios.put(`/trips/${trip._id}`, { title: newTitle, destination: trip.destination });
      setMyTrips(myTrips.map(t => t._id === trip._id ? data : t));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update trip");
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const { data } = await axios.put('/auth/profile', {
        name: profileData.name,
        defaultPreferences: {
          transport: profileData.transport,
          food: profileData.food
        }
      });
      // Update global context with new token and user data
      login(data.token, data.user);
      setIsSettingsOpen(false);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-12 lg:px-24">
      <header className="flex justify-between items-end mb-12 border-b border-white/10 pb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white">My Profile</h1>
          <p className="mt-2 text-lg text-apple-gray">{user?.email}</p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-3 font-semibold text-white bg-apple-surfaceHover rounded-xl hover:bg-white/10 transition-all border border-white/5"
        >
          Back to Home
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Left Sidebar: Preferences */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 bg-apple-surface rounded-3xl border border-white/5 relative">
            
            {/* Settings Icon Button */}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="absolute top-6 right-6 text-apple-gray hover:text-white transition-colors"
              title="Edit Profile Settings"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-white mb-6">Profile Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-apple-gray uppercase tracking-wider">Name</label>
                <p className="text-white font-medium mt-1">{user?.name || "Not Set"}</p>
              </div>
              <div>
                <label className="text-xs text-apple-gray uppercase tracking-wider">Default Transport</label>
                <p className="text-white font-medium mt-1 capitalize">{user?.defaultPreferences?.transport || "Not Set"}</p>
              </div>
              <div>
                <label className="text-xs text-apple-gray uppercase tracking-wider">Food Preference</label>
                <p className="text-white font-medium mt-1 capitalize">{user?.defaultPreferences?.food || "Not Set"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Area: My Trips */}
        <div className="lg:col-span-3">
          <h2 className="text-2xl font-bold text-white mb-6">My Itineraries</h2>
          
          {loading ? (
            <p className="text-apple-gray">Loading your adventures...</p>
          ) : myTrips.length === 0 ? (
            <div className="p-12 text-center bg-apple-surface rounded-3xl border border-dashed border-white/20">
              <p className="text-apple-gray mb-4">You haven't planned any trips yet.</p>
              <button onClick={() => navigate('/')} className="px-6 py-3 font-bold text-white bg-apple-blue rounded-xl hover:opacity-90">
                Plan a Trip Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myTrips.map(trip => (
                <div 
                  key={trip._id} 
                  onClick={() => navigate(`/trip/${trip._id}`)}
                  className="p-6 bg-apple-surface rounded-3xl border border-white/5 hover:border-apple-blue hover:-translate-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-white group-hover:text-apple-blue transition-colors">
                      {trip.title}
                    </h3>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleEditTrip(e, trip)} className="text-xs font-bold text-apple-blue px-2 py-1 bg-apple-blue/10 rounded hover:bg-apple-blue/20">Edit</button>
                      <button onClick={(e) => handleDeleteTrip(e, trip._id)} className="text-xs font-bold text-apple-red px-2 py-1 bg-apple-red/10 rounded hover:bg-apple-red/20">Delete</button>
                    </div>
                  </div>
                  <p className="text-sm text-apple-gray font-medium mb-4">{trip.destination}</p>
                  <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    <span className="text-xs text-apple-gray">
                      {new Date(trip.startDate).toLocaleDateString()}
                    </span>
                    <span className="text-xs font-bold px-3 py-1 bg-apple-surfaceHover rounded-md text-white">
                      {trip.members.length} Member(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- SETTINGS MODAL --- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 bg-apple-surface rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-apple-gray hover:text-white transition-colors text-2xl leading-none">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleProfileUpdate} className="space-y-5">
              <div>
                <label className="block mb-2 text-sm text-apple-gray">Full Name</label>
                <input 
                  type="text" 
                  value={profileData.name} 
                  onChange={e => setProfileData({...profileData, name: e.target.value})} 
                  required 
                  className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue" 
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-apple-gray">Default Transport</label>
                <select 
                  value={profileData.transport} 
                  onChange={e => setProfileData({...profileData, transport: e.target.value})} 
                  className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue appearance-none capitalize"
                >
                  <option value="train">Train</option>
                  <option value="bus">Bus</option>
                  <option value="car">Car</option>
                  <option value="flight">Flight</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm text-apple-gray">Dietary Preference</label>
                <select 
                  value={profileData.food} 
                  onChange={e => setProfileData({...profileData, food: e.target.value})} 
                  className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue appearance-none capitalize"
                >
                  <option value="veg">Vegetarian</option>
                  <option value="non-veg">Non-Vegetarian</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setIsSettingsOpen(false)} disabled={isUpdating} className="px-5 py-2.5 text-sm font-bold text-white bg-apple-surfaceHover rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={isUpdating} className="px-5 py-2.5 text-sm font-bold text-white bg-apple-blue rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                  {isUpdating ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}