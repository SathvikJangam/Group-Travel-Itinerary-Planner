// client/src/pages/TripDashboard.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ExpenseTracker from "../components/ExpenseSplitter/ExpenseTracker";
import ChatWindow from '../components/AICoPilot/ChatWindow';

export default function TripDashboard() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();

  // Core State
  const [trip, setTrip] = useState(null);
  const [activeDay, setActiveDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Timeline'); // 'Timeline' or 'Expenses'
  // Swap Modal State
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [activityToSwap, setActivityToSwap] = useState(null);

  // 1. Fetch Initial Data
  const fetchTrip = async () => {
    try {
      const { data } = await axios.get(`/trips/${tripId}`);
      setTrip(data);
    } catch (error) {
      console.error("Failed to fetch trip details");
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrip();
  }, [tripId, navigate]);

  // 2. Listen for Real-Time Socket Updates (Multiplayer Collaboration)
  useEffect(() => {
    if (!socket) return;

    // Join this specific trip's room
    socket.emit('join-trip', tripId);

    // Listen for changes made by friends
    socket.on('itinerary-updated', (newItinerary) => {
      setTrip((prevTrip) => ({ ...prevTrip, itinerary: newItinerary }));
    });

    return () => socket.off('itinerary-updated');
  }, [socket, tripId]);

  // 3. Handle Drag and Drop Reordering
  const onDragEnd = async (result) => {
    if (!result.destination) return;

    // Clone the itinerary for instant UI feedback
    const items = Array.from(trip.itinerary.find(d => d.dayNumber === activeDay).activities);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItinerary = trip.itinerary.map(day => {
      if (day.dayNumber === activeDay) return { ...day, activities: items };
      return day;
    });

    // Optimistically update UI
    setTrip({ ...trip, itinerary: updatedItinerary });

    try {
      // Send the new array order to the backend
      await axios.put(`/trips/${tripId}/day/${activeDay}/reorder`, { activities: items });

      // Tell socket to update everyone else's screen instantly
      socket.emit('update-itinerary', { tripId, newItinerary: updatedItinerary });
    } catch (err) {
      console.error("Failed to save reorder");
    }
  };

  // 4. Handle Activity Swapping (The MMT Feature)
  const handleSwap = async (alternative) => {
    try {
      const payload = {
        targetActivityId: activityToSwap._id,
        newActivity: alternative
      };

      // Optimistic UI Update (Makes the swap feel instant)
      const updatedItinerary = trip.itinerary.map(day => {
        if (day.dayNumber === activeDay) {
          const updatedActivities = day.activities.map(act =>
            act._id === activityToSwap._id ? { ...act, ...alternative } : act
          );
          return { ...day, activities: updatedActivities };
        }
        return day;
      });
      setTrip({ ...trip, itinerary: updatedItinerary });
      setShowSwapModal(false);

      // Send the swap command to the backend
      await axios.put(`/trips/${tripId}/day/${activeDay}/swap`, payload);

    } catch (err) {
      console.error("Swap failed", err);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-apple-gray">Loading workspace...</div>;
  if (!trip) return null;

  const currentDayData = trip.itinerary.find(d => d.dayNumber === activeDay);

  const filteredAlternatives = trip.availableAlternatives?.filter(alt => {
    if (activityToSwap?.city && alt.city) return alt.city === activityToSwap.city;
    return true; // Fallback for backward compatibility
  }) || [];

  return (
    <div className="flex min-h-screen bg-apple-black overflow-hidden font-sans">

      {/* LEFT SIDE: Main Workspace */}
      <div className="flex-1 flex flex-col h-screen border-r border-white/10">

        {/* Header (Always Visible) */}
        <header className="p-8 border-b border-white/10 bg-apple-surface/30 backdrop-blur-md flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{trip.title}</h1>
            <p className="text-apple-gray">
              {trip.destination} • {new Date(trip.startDate).toLocaleDateString()} to {new Date(trip.endDate).toLocaleDateString()}
            </p>
          </div>

          {/* View Toggle Buttons */}
          <div className="flex bg-black/50 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('Timeline')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Timeline' ? 'bg-apple-surface text-white shadow-lg' : 'text-apple-gray hover:text-white'
                }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('Expenses')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Expenses' ? 'bg-apple-surface text-white shadow-lg' : 'text-apple-gray hover:text-white'
                }`}
            >
              Expenses
            </button>
          </div>
        </header>

        {/* ========================================== */}
        {/* CONDITIONAL RENDERING: Timeline OR Ledger  */}
        {/* ========================================== */}
        {activeTab === 'Timeline' ? (
          <>
            {/* Day Tabs */}
            <div className="flex overflow-x-auto border-b border-white/10 custom-scrollbar bg-apple-black">
              {trip.itinerary.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => setActiveDay(day.dayNumber)}
                  className={`min-w-[120px] py-4 text-sm font-semibold transition-all ${activeDay === day.dayNumber
                    ? 'text-apple-blue border-b-2 border-apple-blue bg-apple-blue/10'
                    : 'text-apple-gray hover:bg-apple-surface'
                    }`}
                >
                  Day {day.dayNumber}
                  <span className="block text-xs font-normal opacity-70 mt-1">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </button>
              ))}
            </div>

            {/* Drag & Drop Timeline */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#0a0a0c]">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-white">Timeline</h2>
                    <button 
                      onClick={() => window.open('https://www.booking.com/', '_blank')}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20"
                    >
                      Book Hotels (Booking.com)
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      const locCount = currentDayData?.activities.filter(a => !['Transit', 'Food'].includes(a.activityType)).length || 0;
                      if (locCount >= 5) {
                        alert("Maximum 5 locations (Sightseeing/Stay) allowed per day. Please remove or swap an activity first.");
                      } else {
                        alert("Adding custom activities feature is coming soon! You can swap existing ones for now.");
                      }
                    }}
                    className="px-4 py-2 text-sm font-bold text-apple-black bg-apple-green rounded-lg hover:opacity-90 transition-opacity">
                    + Add Activity
                  </button>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId={`day-${activeDay}`}>
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">

                        {currentDayData?.activities.length === 0 && (
                          <div className="p-8 text-center border border-dashed border-white/20 rounded-2xl text-apple-gray">
                            No activities planned for this day. Click "+ Add Activity" or drag items here.
                          </div>
                        )}

                        {currentDayData?.activities.map((activity, index) => (
                          <Draggable key={activity._id} draggableId={activity._id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`flex gap-4 p-5 rounded-2xl border transition-all ${snapshot.isDragging
                                  ? 'bg-apple-surfaceHover border-apple-blue shadow-2xl scale-[1.02] z-50'
                                  : 'bg-apple-surface border-white/5 hover:border-white/20'
                                  }`}
                              >
                                {/* Drag Handle Icon */}
                                <div className="flex flex-col items-center justify-center text-apple-gray cursor-grab active:cursor-grabbing">
                                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                  </svg>
                                </div>

                                {/* Activity Info */}
                                <div className="flex-1">
                                  <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-lg font-bold text-white">{activity.title}</h3>

                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-mono text-apple-gray bg-black/50 px-2 py-1 rounded-md">
                                        {activity.time}
                                      </span>
                                      {/* SWAP BUTTON */}
                                      <button
                                        onClick={() => {
                                          setActivityToSwap(activity);
                                          setShowSwapModal(true);
                                        }}
                                        className="text-xs font-bold text-apple-blue hover:text-white transition-colors flex items-center gap-1"
                                      >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Swap
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-sm text-apple-gray">{activity.activityType}</p>

                                  {/* Deep Links */}
                                  {activity.activityType === 'Food' && (
                                    <button 
                                      onClick={() => window.open('https://www.swiggy.com/', '_blank')}
                                      className="mt-4 mr-2 px-3 py-1.5 text-xs font-bold text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors shadow-lg shadow-orange-900/20">
                                      Order via Swiggy
                                    </button>
                                  )}
                                  {activity.activityType === 'Transit' && (
                                    <button 
                                      onClick={() => window.open('https://www.confirmtkt.com/', '_blank')}
                                      className="mt-4 mr-2 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20">
                                      Book via ConfirmTKT
                                    </button>
                                  )}
                                  {activity.activityType === 'Stay' && (
                                    <button 
                                      onClick={() => window.open('https://www.booking.com/', '_blank')}
                                      className="mt-4 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20">
                                      Book via Booking.com
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>
          </>
        ) : (
          /* Render Expense Tracker when activeTab is 'Expenses' */
          <div className="flex-1 overflow-hidden">
            <ExpenseTracker tripId={tripId} tripMembers={trip.members} onMemberAdded={fetchTrip} />
          </div>
        )}
      </div>

      {/* RIGHT SIDE: AI Co-Pilot Panel */}
      <ChatWindow tripId={tripId} />

      {/* ========================================== */}
      {/* THE SWAP MODAL */}
      {/* ========================================== */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg p-6 bg-apple-surface rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Swap "{activityToSwap?.title}"</h2>
              <button
                onClick={() => setShowSwapModal(false)}
                className="text-apple-gray hover:text-white transition-colors text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              {filteredAlternatives.length === 0 ? (
                <p className="text-apple-gray text-center py-8 bg-apple-surfaceHover rounded-xl border border-dashed border-white/10">
                  {trip.availableAlternatives?.length === 0 
                    ? "No alternative spots provided for this package."
                    : `No alternative spots provided for ${activityToSwap?.city}.`}
                </p>
              ) : (
                filteredAlternatives.map((alt, idx) => (
                  <div key={idx} className="p-4 border border-white/5 rounded-2xl bg-apple-surfaceHover hover:border-apple-blue transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-white group-hover:text-apple-blue transition-colors">{alt.title}</h3>
                        <p className="text-xs text-apple-gray font-medium mt-1">{alt.activityType}</p>
                      </div>
                      <button
                        onClick={() => handleSwap(alt)}
                        className="px-4 py-2 text-xs font-bold bg-apple-blue text-white rounded-lg hover:opacity-90 active:scale-[0.98] transition-all"
                      >
                        Select
                      </button>
                    </div>
                    {alt.description && (
                      <p className="text-sm text-apple-lightText/70 mt-3 border-t border-white/5 pt-3">
                        {alt.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}