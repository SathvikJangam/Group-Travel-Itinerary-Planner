// client/src/pages/AdminPanel.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const [packages, setPackages] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Cloudinary Image States
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    cities: '', 
    defaultDays: 1,
    description: '',
    coverImage: '',
    itineraryTemplate: [],
    alternativeActivities: []
  });

  const navigate = useNavigate();

  const fetchPackages = async () => {
    try {
      const { data } = await axios.get('/packages/admin');
      setPackages(data);
    } catch (error) {
      console.error("Failed to fetch packages");
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const openModal = (pkg = null) => {
    setImageFile(null); // Clear out any previously chosen file
    if (pkg) {
      setEditingId(pkg._id);
      setFormData({
        title: pkg.title,
        cities: pkg.cities.join(', '), 
        defaultDays: pkg.defaultDays,
        description: pkg.description,
        coverImage: pkg.coverImage || '',
        itineraryTemplate: pkg.itineraryTemplate || [],
        alternativeActivities: pkg.alternativeActivities || []
      });
    } else {
      setEditingId(null);
      setFormData({ title: '', cities: '', defaultDays: 1, description: '', coverImage: '', itineraryTemplate: [], alternativeActivities: [] });
    }
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Itinerary Handlers
  const addDay = () => {
    setFormData(prev => ({
      ...prev,
      itineraryTemplate: [...prev.itineraryTemplate, { dayNumber: prev.itineraryTemplate.length + 1, activities: [] }]
    }));
  };

  const addActivity = (dayIndex) => {
    // Validate limit BEFORE setting state
    const currentDay = formData.itineraryTemplate[dayIndex];
    const locCount = currentDay.activities.filter(a => !['Transit', 'Food'].includes(a.activityType)).length;
    if (locCount >= 5) {
      alert("Maximum 5 locations (Sightseeing/Stay) allowed per day.");
      return;
    }

    setFormData(prev => ({
      ...prev,
      itineraryTemplate: prev.itineraryTemplate.map((day, idx) => 
        idx === dayIndex 
          ? { ...day, activities: [...day.activities, { time: '', title: '', city: '', activityType: 'Sightseeing' }] } 
          : day
      )
    }));
  };

  const updateActivity = (dayIndex, actIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      itineraryTemplate: prev.itineraryTemplate.map((day, idx) => 
        idx === dayIndex 
          ? { 
              ...day, 
              activities: day.activities.map((act, i) => i === actIndex ? { ...act, [field]: value } : act) 
            } 
          : day
      )
    }));
  };

  const removeActivity = (dayIndex, actIndex) => {
    setFormData(prev => ({
      ...prev,
      itineraryTemplate: prev.itineraryTemplate.map((day, idx) => 
        idx === dayIndex 
          ? { ...day, activities: day.activities.filter((_, i) => i !== actIndex) } 
          : day
      )
    }));
  };

  const removeDay = (dayIndex) => {
    setFormData(prev => {
      const newItinerary = prev.itineraryTemplate.filter((_, idx) => idx !== dayIndex);
      newItinerary.forEach((day, idx) => day.dayNumber = idx + 1);
      return { ...prev, itineraryTemplate: newItinerary };
    });
  };

  // Alternatives Handlers
  const addAlternative = () => {
    setFormData(prev => ({
      ...prev,
      alternativeActivities: [...prev.alternativeActivities, { title: '', city: '', activityType: 'Sightseeing', description: '' }]
    }));
  };

  const updateAlternative = (index, field, value) => {
    setFormData(prev => {
      const newAlts = [...prev.alternativeActivities];
      newAlts[index][field] = value;
      return { ...prev, alternativeActivities: newAlts };
    });
  };

  const removeAlternative = (index) => {
    setFormData(prev => {
      const newAlts = [...prev.alternativeActivities];
      newAlts.splice(index, 1);
      return { ...prev, alternativeActivities: newAlts };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    for (const day of formData.itineraryTemplate) {
      const locCount = day.activities.filter(a => !['Transit', 'Food'].includes(a.activityType)).length;
      if (locCount > 5) {
        alert(`Day ${day.dayNumber} has more than 5 locations. Please reduce to 5 or fewer.`);
        return;
      }
    }

    setIsUploading(true);
    let uploadedImageUrl = formData.coverImage; 

    if (imageFile) {
      const imgData = new FormData();
      imgData.append("file", imageFile);
      imgData.append("upload_preset", "travel_itinerary_app_preset"); 
      
      try {
        const res = await fetch("https://api.cloudinary.com/v1_1/dladxvssj/image/upload", {
          method: "POST",
          body: imgData
        });
        const cloudData = await res.json();
        uploadedImageUrl = cloudData.secure_url;
      } catch (err) {
        console.error("Image upload failed", err);
      }
    }
    
    const payload = {
      ...formData,
      coverImage: uploadedImageUrl, 
      cities: formData.cities.split(',').map(city => city.trim()).filter(c => c)
    };

    try {
      if (editingId) {
        await axios.put(`/packages/${editingId}`, payload);
      } else {
        await axios.post('/packages', payload);
      }
      setIsModalOpen(false);
      setImageFile(null); 
      fetchPackages();
    } catch (error) {
      console.error("Save failed", error);
      alert(error.response?.data?.error || "Save failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this package?")) {
      try {
        await axios.delete(`/packages/${id}`);
        setPackages(packages.filter(p => p._id !== id));
      } catch (error) {
        console.error("Delete failed");
      }
    }
  };

  return (
    <div className="min-h-screen px-6 py-12 lg:px-24">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Admin Hub</h1>
          <p className="mt-2 text-lg text-apple-gray">Manage Curated Tour Packages & Locations</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-3 font-semibold text-white bg-apple-surfaceHover rounded-xl hover:bg-apple-surface transition-all"
          >
            Exit Admin
          </button>
          <button 
            onClick={() => openModal()}
            className="px-6 py-3 font-semibold text-white bg-apple-blue rounded-xl hover:opacity-90 transition-all"
          >
            + Create Package
          </button>
        </div>
      </header>

      {/* Package Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div key={pkg._id} className="p-6 bg-apple-surface rounded-3xl border border-white/5 flex flex-col justify-between overflow-hidden group relative">
            {pkg.tags && pkg.tags.includes('AI-Generated') && (
              <div className="absolute top-4 right-4 text-yellow-400 text-xl z-10" title="AI Generated">⭐</div>
            )}
            <div>
              {pkg.coverImage ? (
                <div className="w-full h-40 mb-4 rounded-xl overflow-hidden bg-apple-surfaceHover">
                  <img src={pkg.coverImage} alt={pkg.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-40 mb-4 rounded-xl bg-apple-surfaceHover flex items-center justify-center text-apple-gray text-sm">
                  No Cover Image Linked
                </div>
              )}
              <h3 className="text-xl font-bold text-white mb-2 pr-6">{pkg.title}</h3>
              <p className="text-sm text-apple-gray mb-4">{pkg.defaultDays} Days • {pkg.cities.join(' - ')}</p>
              <p className="text-sm text-apple-lightText/80 line-clamp-2 mb-6">{pkg.description}</p>
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button 
                onClick={() => openModal(pkg)}
                className="flex-1 py-2 text-sm font-semibold bg-apple-surfaceHover text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                Edit
              </button>
              <button 
                onClick={() => handleDelete(pkg._id)}
                className="flex-1 py-2 text-sm font-semibold bg-apple-red/10 text-apple-red rounded-lg hover:bg-apple-red/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl p-8 bg-apple-surface rounded-3xl border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <h2 className="text-2xl font-bold mb-6 text-white">
              {editingId ? 'Edit Package & Locations' : 'New Package & Locations'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Basic Info Section */}
              <div className="space-y-5 p-6 bg-apple-surfaceHover rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold text-apple-blue">Basic Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block mb-2 text-sm text-apple-gray">Title</label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required
                      className="w-full p-4 bg-apple-black text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue" />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm text-apple-gray">Cities (Comma Separated)</label>
                    <input type="text" name="cities" placeholder="e.g. Delhi, Agra, Jaipur" value={formData.cities} onChange={handleChange} required
                      className="w-full p-4 bg-apple-black text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue" />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm text-apple-gray">Cover Image Asset</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="w-full p-4 bg-apple-black text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-apple-blue file:text-white hover:file:opacity-90 transition-all cursor-pointer" 
                  />
                  {formData.coverImage && !imageFile && (
                    <p className="text-xs text-apple-green mt-2">Asset safely stored. Upload a fresh file to replace it.</p>
                  )}
                </div>

                <div>
                  <label className="block mb-2 text-sm text-apple-gray">Default Duration (Days)</label>
                  <input type="number" name="defaultDays" min="1" value={formData.defaultDays} onChange={handleChange} required
                    className="w-full p-4 bg-apple-black text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue" />
                </div>

                <div>
                  <label className="block mb-2 text-sm text-apple-gray">Description</label>
                  <textarea name="description" rows="3" value={formData.description} onChange={handleChange} required
                    className="w-full p-4 bg-apple-black text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue resize-none"></textarea>
                </div>
              </div>

              {/* Itinerary Builder Section */}
              <div className="space-y-5 p-6 bg-apple-surfaceHover rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-apple-blue">Itinerary Locations (Max 5 per day)</h3>
                  <button type="button" onClick={addDay} className="px-4 py-2 text-sm font-bold bg-apple-green text-apple-black rounded-lg">
                    + Add Day
                  </button>
                </div>
                
                {formData.itineraryTemplate.map((day, dIdx) => (
                  <div key={dIdx} className="p-4 mb-4 bg-apple-black rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-white">Day {day.dayNumber}</h4>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => addActivity(dIdx)} className="text-xs font-bold text-apple-blue px-3 py-1 rounded bg-apple-blue/10 hover:bg-apple-blue/20">
                          + Add Location
                        </button>
                        <button type="button" onClick={() => removeDay(dIdx)} className="text-xs font-bold text-apple-red px-3 py-1 rounded bg-apple-red/10 hover:bg-apple-red/20">
                          Remove Day
                        </button>
                      </div>
                    </div>

                    {day.activities.map((act, aIdx) => (
                      <div key={aIdx} className="flex gap-3 items-end mb-3 pb-3 border-b border-white/5">
                        <div className="flex-1">
                          <label className="text-xs text-apple-gray">Time</label>
                          <input type="time" value={act.time} onChange={(e) => updateActivity(dIdx, aIdx, 'time', e.target.value)}
                            className="w-full p-2 mt-1 bg-apple-surface text-sm text-white rounded outline-none [color-scheme:dark]" />
                        </div>
                        <div className="flex-1 w-1/4">
                          <label className="text-xs text-apple-gray">Location Title</label>
                          <input type="text" placeholder="Taj Mahal" value={act.title} onChange={(e) => updateActivity(dIdx, aIdx, 'title', e.target.value)}
                            className="w-full p-2 mt-1 bg-apple-surface text-sm text-white rounded outline-none" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-apple-gray">City</label>
                          <select value={act.city} onChange={(e) => updateActivity(dIdx, aIdx, 'city', e.target.value)}
                            className="w-full p-2 mt-1 bg-apple-surface text-sm text-white rounded outline-none">
                            <option value="">Select City</option>
                            {formData.cities.split(',').map(c => c.trim()).filter(c => c).map((city, idx) => (
                              <option key={idx} value={city}>{city}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-apple-gray">Type</label>
                          <select value={act.activityType} onChange={(e) => updateActivity(dIdx, aIdx, 'activityType', e.target.value)}
                            className="w-full p-2 mt-1 bg-apple-surface text-sm text-white rounded outline-none">
                            <option value="Sightseeing">Sightseeing</option>
                            <option value="Food">Food</option>
                            <option value="Transit">Transit</option>
                            <option value="Stay">Stay</option>
                          </select>
                        </div>
                        <button type="button" onClick={() => removeActivity(dIdx, aIdx)} className="p-2 mb-1 text-apple-red hover:bg-apple-red/10 rounded">
                          &times;
                        </button>
                      </div>
                    ))}
                    {day.activities.length === 0 && <p className="text-xs text-apple-gray">No locations added for this day.</p>}
                  </div>
                ))}
              </div>

              {/* Alternatives / Extra Locations Section */}
              <div className="space-y-5 p-6 bg-apple-surfaceHover rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-apple-blue">Extra Recommended Locations</h3>
                    <p className="text-xs text-apple-gray">Users can swap existing locations with these.</p>
                  </div>
                  <button type="button" onClick={addAlternative} className="px-4 py-2 text-sm font-bold bg-apple-green text-apple-black rounded-lg">
                    + Add Extra Location
                  </button>
                </div>

                {formData.alternativeActivities.map((alt, altIdx) => (
                  <div key={altIdx} className="p-4 mb-4 bg-apple-black rounded-xl border border-white/5">
                    <div className="flex justify-between items-start mb-2">
                      <div className="grid grid-cols-3 gap-4 w-full mr-4">
                        <div>
                          <label className="text-xs text-apple-gray">Title</label>
                          <input type="text" placeholder="Local Market" value={alt.title} onChange={(e) => updateAlternative(altIdx, 'title', e.target.value)}
                            className="w-full p-2 mt-1 bg-apple-surface text-sm text-white rounded outline-none" />
                        </div>
                        <div>
                          <label className="text-xs text-apple-gray">City</label>
                          <select value={alt.city} onChange={(e) => updateAlternative(altIdx, 'city', e.target.value)}
                            className="w-full p-2 mt-1 bg-apple-surface text-sm text-white rounded outline-none">
                            <option value="">Select City</option>
                            {formData.cities.split(',').map(c => c.trim()).filter(c => c).map((city, idx) => (
                              <option key={idx} value={city}>{city}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-apple-gray">Type</label>
                          <select value={alt.activityType} onChange={(e) => updateAlternative(altIdx, 'activityType', e.target.value)}
                            className="w-full p-2 mt-1 bg-apple-surface text-sm text-white rounded outline-none">
                            <option value="Sightseeing">Sightseeing</option>
                            <option value="Food">Food</option>
                            <option value="Transit">Transit</option>
                            <option value="Stay">Stay</option>
                          </select>
                        </div>
                        <div className="col-span-3">
                          <label className="text-xs text-apple-gray">Description</label>
                          <input type="text" placeholder="A great place to shop..." value={alt.description} onChange={(e) => updateAlternative(altIdx, 'description', e.target.value)}
                            className="w-full p-2 mt-1 bg-apple-surface text-sm text-white rounded outline-none" />
                        </div>
                      </div>
                      <button type="button" onClick={() => removeAlternative(altIdx)} className="p-2 text-apple-red hover:bg-apple-red/10 rounded mt-5">
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
                {formData.alternativeActivities.length === 0 && <p className="text-xs text-apple-gray">No extra locations added.</p>}
              </div>
              
              <div className="flex justify-end gap-4 pt-6 border-t border-white/10 sticky bottom-0 bg-apple-surface pb-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={isUploading}
                  className="px-6 py-3 font-semibold text-white bg-apple-surfaceHover rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-3 font-semibold text-white bg-apple-blue rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isUploading ? 'Uploading & Saving...' : 'Save Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}