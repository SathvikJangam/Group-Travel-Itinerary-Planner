// server/models/Package.js
import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  
  // Array of strings to support single or multi-city tours
  cities: [{ type: String, required: true }], 
  
  tags: [{ type: String }],
  defaultDays: { type: Number, required: true },
  coverImage: { type: String }, 
  description: { type: String },
  
  // The master template that gets cloned when a user builds a trip
  itineraryTemplate: [{
    dayNumber: { type: Number },
    activities: [{
      time: { type: String },
      title: { type: String },
      city: { type: String },
      activityType: { type: String, enum: ['Transit', 'Stay', 'Sightseeing', 'Food'] },
      locationCoords: { lat: Number, lng: Number }
    }]
  }],
  
  alternativeActivities: [{
    title: { type: String },
    city: { type: String },
    activityType: { type: String, enum: ['Transit', 'Stay', 'Sightseeing', 'Food'] },
    description: { type: String },
    locationCoords: { lat: Number, lng: Number }
  }],
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Package', packageSchema);