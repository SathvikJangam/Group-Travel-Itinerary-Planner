// server/models/Trip.js
import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema({
  title: { type: String, required: true },
  destination: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  // The Collaborative Group
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional for guests
    guestId: { type: String }, // Unique ID for guests
    name: { type: String }, // User's name or 'Guest X'
    isGuest: { type: Boolean, default: false },
    role: { type: String, enum: ['Creator', 'Member', 'Guest'], default: 'Member' }
  }],

  // The Drag-and-Drop Itinerary
  itinerary: [{
    dayNumber: { type: Number },
    date: { type: Date },
    activities: [{
      time: { type: String },
      title: { type: String },
      city: { type: String },
      activityType: { type: String, enum: ['Transit', 'Stay', 'Sightseeing', 'Food'] },

      // Swiggy/Zomato Deep Linking:
      locationCoords: {
        lat: { type: Number },
        lng: { type: Number }
      },

      // ConfirmTKT Deep Linking:
      transitDetails: {
        sourceStation: { type: String },
        destStation: { type: String },
        classPref: { type: String }
      } // REMOVED THE STRAY '*' HERE
    }]
  }],

  // MOVED OUTSIDE OF ITINERARY: Cloned from the package so the user can swap them in
  availableAlternatives: [{
    title: { type: String },
    city: { type: String },
    activityType: { type: String },
    description: { type: String },
    locationCoords: { lat: Number, lng: Number }
  }],

  // Caching the Gemini AI response
  aiBudgetEstimate: {
    total: Number,
    transport: Number,
    hotel: Number,
    food: Number,
    lastUpdated: Date
  }
}, { timestamps: true });

const TripModel = mongoose.model("Trip", tripSchema);
export default TripModel;