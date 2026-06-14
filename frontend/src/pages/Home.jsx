// client/src/pages/Home.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchDays, setSearchDays] = useState('');
  const [packages, setPackages] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    selectedPackageId: null,
    travelersCount: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedPackageDetails, setSelectedPackageDetails] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState('preview'); // 'preview' | 'form'
  
  const [aiCities, setAiCities] = useState('');
  const [aiDays, setAiDays] = useState('');
  const [isGeneratingPackage, setIsGeneratingPackage] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchPackages = async () => {
      setIsSearching(true);
      try {
        const { data } = await axios.get('/packages', {
          params: { search: searchQuery, days: searchDays }
        });
        setPackages(data);
      } catch (err) {
        console.error("Failed to fetch packages");
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchPackages();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchDays]);

  const handleTripChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const selectPackage = (pkg) => {
    setFormData({
      ...formData,
      title: `${pkg.title} (Custom)`,
      destination: pkg.cities.join(' - '),
      selectedPackageId: pkg._id
    });
    setSelectedPackageDetails(pkg);
    setModalStep('preview');
    setShowModal(true);
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    setError('');

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      return setError('End date must be after the start date.');
    }

    setLoading(true);
    try {
      await axios.post('/trips', formData);
      setShowModal(false);
      navigate('/profile');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create trip.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCustomPackage = async () => {
    if (!aiCities.trim()) return alert("Please enter at least one city.");
    if (!aiDays || Number(aiDays) <= 0) return alert("Please enter the total number of days.");
    setIsGeneratingPackage(true);
    try {
      const { data } = await axios.post('/ai/generate-package', {
        cities: aiCities.split(',').map(c => c.trim()),
        totalDays: Number(aiDays)
      });
      setPackages(prev => [data, ...prev]);
      selectPackage(data);
      setAiCities('');
    } catch (err) {
      console.error(err);
      alert("Failed to generate AI package.");
    } finally {
      setIsGeneratingPackage(false);
    }
  };

  // ==========================================
  // SMART CATEGORIZATION ALGORITHM
  // ==========================================
  let dedicatedPackages = [];
  let comboPackages = [];

  packages.forEach(pkg => {
    // Determine if it's a 1-city or multi-city tour
    if (pkg.cities.length === 1) {
      dedicatedPackages.push(pkg);
    } else {
      comboPackages.push(pkg);
    }
  });

  const renderPackageCard = (pkg) => (
    <div
      key={pkg._id}
      onClick={() => selectPackage(pkg)}
      className="p-6 cursor-pointer bg-apple-surface rounded-3xl border border-white/5 hover:border-apple-blue hover:-translate-y-1 transition-all group relative"
    >
      {pkg.tags && pkg.tags.includes('AI-Generated') && (
        <div className="absolute top-4 right-4 text-yellow-400 text-xl" title="AI Generated">⭐</div>
      )}
      {searchDays && pkg.defaultDays === Number(searchDays) && (
        <span className="inline-block px-3 py-1 mb-4 text-xs font-bold text-apple-black bg-apple-blue rounded-full">
          Perfect Match
        </span>
      )}
      <h3 className="text-xl font-bold mb-1 group-hover:text-apple-blue transition-colors pr-6">
        {pkg.title}
      </h3>
      <p className="text-sm text-apple-gray mb-4 font-medium">{pkg.defaultDays} Days • {pkg.cities.join(' - ')}</p>
      <p className="text-sm text-apple-lightText/80 line-clamp-3">
        {pkg.description || "Click to use this template."}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen px-6 py-12 lg:px-24">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Hello, {user?.name || 'Traveler'}
          </h1>
          <p className="mt-2 text-lg text-apple-gray">Pick a curated package or build your own from scratch.</p>
        </div>

        <div className="flex gap-4 items-center">
          {/* PROFILE BUTTON - Visible to everyone logged in */}
          <button
            onClick={() => navigate('/profile')}
            className="px-6 py-3 font-semibold text-white bg-apple-surfaceHover rounded-xl hover:bg-white/10 transition-all border border-white/5"
          >
            👤 My Itineraries
          </button>

          {/* ADMIN DASHBOARD - Only renders if the user is an Admin */}
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="px-6 py-3 font-semibold text-apple-black bg-apple-green rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-apple-green/20"
            >
              Admin Dashboard
            </button>
          )}

          {/* SIGN OUT BUTTON */}
          <button 
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="px-6 py-3 font-semibold text-apple-red bg-apple-red/10 rounded-xl hover:bg-apple-red/20 transition-all border border-apple-red/20"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* --- HERO SEARCH SECTION --- */}
      <section className="mb-12 p-8 bg-apple-surface rounded-3xl border border-white/5 shadow-lg">
        <h2 className="text-2xl font-semibold mb-6">Where are you heading?</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search a city, state, or spot..."
            className="flex-1 p-4 bg-apple-black text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <input
            type="number"
            placeholder="Days (Optional)"
            min="1"
            className="w-full md:w-48 p-4 bg-apple-black text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue transition-all"
            value={searchDays}
            onChange={(e) => setSearchDays(e.target.value)}
          />
        </div>
      </section>



      {/* --- DYNAMIC PACKAGES GRID --- */}
      <section className="mb-16">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-semibold">
            {searchQuery ? `Results for "${searchQuery}"` : "Trending Destinations"}
          </h2>
          {isSearching && <span className="text-sm text-apple-blue animate-pulse">Searching...</span>}
        </div>

        {packages.length === 0 && !isSearching ? (
          <div className="p-8 text-center bg-apple-surface rounded-3xl border border-white/5 text-apple-gray">
            No packages found. Try a different location or start from scratch below!
          </div>
        ) : (
          <div>
            {/* DEDICATED CITY TOURS */}
            {dedicatedPackages.length > 0 && (
              <div className="mb-8">
                {searchQuery && <h3 className="text-lg text-apple-gray mb-4">Dedicated City Tours</h3>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {dedicatedPackages.map(pkg => renderPackageCard(pkg))}
                </div>
              </div>
            )}

            {/* MULTI-CITY COMBOS */}
            {comboPackages.length > 0 && (
              <div className="mt-8 border-t border-white/10 pt-8">
                <h3 className="text-lg text-apple-blue mb-4">
                  {searchQuery ? `Multi-City Combos including ${searchQuery}` : "Multi-City Adventures"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {comboPackages.map(pkg => renderPackageCard(pkg))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* --- CREATE CUSTOM PACKAGE (AI) --- */}
      <section className="mb-16 p-8 bg-gradient-to-br from-apple-surface to-apple-surfaceHover rounded-3xl border border-apple-blue/30 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-apple-blue via-purple-500 to-pink-500"></div>
        <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
          <span>✨</span> Create a Custom Package
        </h2>
        <p className="text-sm text-apple-gray mb-6">
          Enter the cities you want to explore (comma-separated) and the total number of days. Our AI will craft the perfect package with famous locations, transit options, and food recommendations!
        </p>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Cities (e.g. Kyoto, Osaka, Nara)"
            className="flex-[2] p-4 bg-apple-black text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500 transition-all border border-white/10"
            value={aiCities}
            onChange={(e) => setAiCities(e.target.value)}
          />
          <input
            type="number"
            placeholder="Total Days"
            min="1"
            className="flex-1 p-4 bg-apple-black text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500 transition-all border border-white/10"
            value={aiDays}
            onChange={(e) => setAiDays(e.target.value)}
          />
          <button
            onClick={handleGenerateCustomPackage}
            disabled={isGeneratingPackage}
            className="w-full md:w-auto px-8 py-4 font-bold text-white bg-gradient-to-r from-apple-blue to-purple-600 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
          >
            {isGeneratingPackage ? (
              <span className="animate-pulse">Generating...</span>
            ) : (
              "Generate Package"
            )}
          </button>
        </div>
      </section>

      {/* --- PACKAGE MODAL (PREVIEW & FORM) --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-apple-surface border border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col relative">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-apple-surfaceHover sticky top-0 z-10">
              <h2 className="text-2xl font-bold">
                {modalStep === 'preview' ? 'Package Preview' : 'Finalize Your Plan'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 bg-apple-black rounded-full hover:bg-apple-red/20 hover:text-apple-red transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar">
              {modalStep === 'preview' && selectedPackageDetails && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-3xl font-bold text-apple-blue mb-2">{selectedPackageDetails.title}</h3>
                    <p className="text-apple-gray text-lg">{selectedPackageDetails.description}</p>
                    <p className="mt-2 text-sm font-medium">Cities: {selectedPackageDetails.cities.join(', ')} • {selectedPackageDetails.defaultDays} Days</p>
                  </div>
                  
                  <div>
                    <h4 className="text-xl font-semibold mb-4 border-b border-white/10 pb-2">Itinerary Preview</h4>
                    {selectedPackageDetails.itineraryTemplate?.length > 0 ? (
                      <div className="space-y-6">
                        {selectedPackageDetails.itineraryTemplate.map((day) => (
                          <div key={day._id || day.dayNumber} className="bg-apple-black p-4 rounded-xl border border-white/5">
                            <h5 className="font-bold text-apple-lightText mb-3">Day {day.dayNumber}</h5>
                            <div className="space-y-2">
                              {day.activities.map((act, i) => (
                                <div key={act._id || i} className="flex items-start gap-3 text-sm">
                                  <span className="text-apple-blue font-mono">{act.time}</span>
                                  <div>
                                    <p className="font-semibold">{act.title}</p>
                                    <p className="text-apple-gray text-xs">{act.activityType} • {act.city}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-apple-gray">No itinerary details available.</p>
                    )}
                  </div>
                </div>
              )}

              {modalStep === 'form' && (
                <div>
                  <p className="text-sm text-apple-gray mb-6">
                    {formData.selectedPackageId ? "Customize your dates and group size below to start tweaking this package." : "Creating a blank itinerary from scratch."}
                  </p>

                  <form onSubmit={handleCreateTrip} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-apple-gray">Trip Title</label>
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue"
                          onChange={handleTripChange}
                          required
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-apple-gray">Destination</label>
                        <input
                          type="text"
                          name="destination"
                          value={formData.destination}
                          className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue"
                          onChange={handleTripChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-apple-gray">Start Date</label>
                        <input
                          type="date"
                          name="startDate"
                          min={today}
                          className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue [color-scheme:dark]"
                          onChange={handleTripChange}
                          required
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-apple-gray">End Date</label>
                        <input
                          type="date"
                          name="endDate"
                          min={formData.startDate || today}
                          className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue [color-scheme:dark]"
                          onChange={handleTripChange}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-apple-gray">Number of Travelers</label>
                      <input
                        type="number"
                        name="travelersCount"
                        min="1"
                        value={formData.travelersCount}
                        className="w-full p-4 bg-apple-surfaceHover text-white rounded-xl outline-none focus:ring-2 focus:ring-apple-blue"
                        onChange={handleTripChange}
                        required
                      />
                    </div>
                    {error && <p className="text-apple-red text-sm">{error}</p>}
                  </form>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/10 bg-apple-surfaceHover flex justify-end gap-4 sticky bottom-0 z-10">
              {modalStep === 'preview' ? (
                <button
                  onClick={() => setModalStep('form')}
                  className="px-8 py-3 font-semibold text-white bg-apple-blue rounded-xl hover:opacity-90 transition-all shadow-lg shadow-apple-blue/20"
                >
                  Customize & Book -&gt;
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setModalStep('preview')}
                    className="px-6 py-3 font-semibold text-apple-lightText bg-apple-black rounded-xl hover:bg-white/5 transition-all"
                  >
                    &lt;- Back to Preview
                  </button>
                  <button
                    onClick={handleCreateTrip}
                    disabled={loading}
                    className="px-8 py-3 font-semibold text-white bg-apple-green rounded-xl hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-apple-green/20"
                  >
                    {loading ? 'Creating...' : 'Create Trip'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}