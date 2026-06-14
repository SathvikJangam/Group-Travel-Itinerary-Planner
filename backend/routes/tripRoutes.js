import express from 'express';
import { 
  createTrip, 
  getTripDetails, 
  getMyTrips, 
  swapActivity, 
  reorderDay,
  deleteTrip,
  updateTrip,
  inviteMember,
  inviteGuest,
  removeMember,
  renameGuest
} from '../controllers/tripController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Fetch all trips for the logged-in user (Profile Page)
router.get('/my-trips', protect, getMyTrips);

// Create a new trip (Dashboard generation)
router.post('/', protect, createTrip);

// Get specific trip data (Dashboard view)
router.get('/:tripId', protect, getTripDetails);

// Swap an activity (MakeMyTrip Feature)
router.put('/:tripId/day/:dayNumber/swap', protect, swapActivity);

// Save the drag-and-drop array order
router.put('/:tripId/day/:dayNumber/reorder', protect, reorderDay);

// Update trip details (title, destination)
router.put('/:tripId', protect, updateTrip);

// Delete a trip
router.delete('/:tripId', protect, deleteTrip);

// Invite a registered member
router.post('/:tripId/invite-member', protect, inviteMember);

// Add a guest
router.post('/:tripId/invite-guest', protect, inviteGuest);

// Remove a participant
router.delete('/:tripId/members/:memberId', protect, removeMember);

// Rename a guest
router.put('/:tripId/members/:memberId/rename', protect, renameGuest);

export default router;