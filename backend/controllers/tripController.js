// server/controllers/tripController.js
import Trip from '../models/Trip.js';
import Package from '../models/Package.js';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import { generateItineraryForBlankTrip } from './aiController.js';

// 1. Create Trip (Clones the Package)
export const createTrip = async (req, res) => {
  try {
    const { title, destination, startDate, endDate, selectedPackageId, travelersCount } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Check for overlapping dates or same title for this user
    const existingTrips = await Trip.find({ "members.userId": req.user._id });
    
    for (let trip of existingTrips) {
      if (trip.title.toLowerCase() === title.toLowerCase()) {
        return res.status(400).json({ error: "You already have an itinerary with this exact name." });
      }

      const existingStart = new Date(trip.startDate);
      const existingEnd = new Date(trip.endDate);

      // Overlap condition: New start is before or equal to existing end AND new end is after or equal to existing start
      if (start <= existingEnd && end >= existingStart) {
        return res.status(400).json({ 
          error: `Your selected dates overlap with an existing trip: "${trip.title}" (${existingStart.toLocaleDateString()} - ${existingEnd.toLocaleDateString()}). Please select different dates.` 
        });
      }
    }

    const totalTripDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    let finalItinerary = [];
    let clonedAlternatives = []; 

    if (selectedPackageId) {
      const pkg = await Package.findById(selectedPackageId);
      if (pkg) {
        clonedAlternatives = pkg.alternativeActivities || []; 
        
        for (let i = 1; i <= totalTripDays; i++) {
          const currentDate = new Date(start);
          currentDate.setDate(start.getDate() + (i - 1));
          const templateDay = pkg.itineraryTemplate.find(d => d.dayNumber === i);

          finalItinerary.push({
            dayNumber: i,
            date: currentDate,
            activities: templateDay ? templateDay.activities : []
          });
        }
      }
    } else {
      // It's a blank trip, let's ask AI to generate an itinerary
      try {
        const aiData = await generateItineraryForBlankTrip(destination, totalTripDays);
        clonedAlternatives = aiData.alternativeActivities || [];

        for (let i = 1; i <= totalTripDays; i++) {
          const currentDate = new Date(start);
          currentDate.setDate(start.getDate() + (i - 1));
          const templateDay = aiData.itineraryTemplate.find(d => d.dayNumber === i);

          finalItinerary.push({
            dayNumber: i,
            date: currentDate,
            activities: templateDay ? templateDay.activities : []
          });
        }
      } catch (aiErr) {
        console.error("Blank Trip AI generation failed, falling back to empty days", aiErr);
        for (let i = 1; i <= totalTripDays; i++) {
          const currentDate = new Date(start);
          currentDate.setDate(start.getDate() + (i - 1));
          finalItinerary.push({
            dayNumber: i,
            date: currentDate,
            activities: []
          });
        }
      }
    }

    // Generate Members Array
    const tripMembers = [{ 
      userId: req.user._id, 
      name: req.user.name || 'Creator', 
      role: 'Creator' 
    }];

    const totalTravelers = Number(travelersCount) || 1;
    for (let i = 2; i <= totalTravelers; i++) {
      tripMembers.push({
        guestId: `guest-${Date.now()}-${i}`,
        name: `Traveler ${i}`,
        isGuest: true,
        role: 'Guest'
      });
    }

    const newTrip = new Trip({
      title,
      destination,
      startDate,
      endDate,
      members: tripMembers, 
      itinerary: finalItinerary,
      availableAlternatives: clonedAlternatives
    });

    await newTrip.save();
    return res.status(201).json(newTrip);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create trip" });
  }
};

// 2. Fetch specific trip for the Dashboard
export const getTripDetails = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId).populate('members.userId', 'name email');
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    return res.status(200).json(trip);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch trip" });
  }
};

// 3. Fetch user's trips for the Profile Page
export const getMyTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ "members.userId": req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(trips);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch your trips" });
  }
};

// 4. Handle Drag-and-Drop Reordering
export const reorderDay = async (req, res) => {
  try {
    const { tripId, dayNumber } = req.params;
    const { activities } = req.body; 

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const dayIndex = trip.itinerary.findIndex(d => d.dayNumber === Number(dayNumber));
    if (dayIndex !== -1) {
      trip.itinerary[dayIndex].activities = activities;
      await trip.save();
      return res.status(200).json(trip);
    }
    
    return res.status(404).json({ error: "Day not found" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to reorder day" });
  }
};

// 5. Handle MakeMyTrip Activity Swaps
export const swapActivity = async (req, res) => {
  try {
    const { tripId, dayNumber } = req.params;
    const { targetActivityId, newActivity } = req.body; 

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const dayIndex = trip.itinerary.findIndex(d => d.dayNumber === Number(dayNumber));
    if (dayIndex === -1) return res.status(404).json({ error: "Day not found" });

    const activityIndex = trip.itinerary[dayIndex].activities.findIndex(
      a => a._id.toString() === targetActivityId
    );

    if (activityIndex !== -1) {
      const originalTime = trip.itinerary[dayIndex].activities[activityIndex].time;
      trip.itinerary[dayIndex].activities[activityIndex] = {
        ...newActivity,
        time: originalTime 
      };
      
      await trip.save();
      return res.status(200).json(trip);
    }
    
    return res.status(404).json({ error: "Activity not found" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to swap activity" });
  }
};

// 6. Handle Trip Deletion
export const deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findOneAndDelete({ _id: req.params.tripId, "members.userId": req.user._id });
    if (!trip) return res.status(404).json({ error: "Trip not found or unauthorized" });
    return res.status(200).json({ message: "Trip deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete trip" });
  }
};

// 8. Invite a registered user to the trip
export const inviteMember = async (req, res) => {
  try {
    const { email } = req.body;
    const trip = await Trip.findById(req.params.tripId).populate('members.userId', 'name email');
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    // Verify creator
    const isCreator = trip.members.find(m => m.userId?._id?.toString() === req.user._id.toString() && m.role === 'Creator');
    if (!isCreator) return res.status(403).json({ error: "Only the trip creator can invite members" });

    const userToInvite = await User.findOne({ email });
    if (!userToInvite) return res.status(404).json({ error: "User not found with that email" });

    // Check if already a member
    const alreadyMember = trip.members.find(m => m.userId?._id?.toString() === userToInvite._id.toString());
    if (alreadyMember) return res.status(400).json({ error: "User is already a member of this trip" });

    // 1. Find Placeholder
    const placeholderIndex = trip.members.findIndex(m => m.isGuest && m.name.startsWith('Traveler '));

    if (placeholderIndex !== -1) {
      const oldGuestId = trip.members[placeholderIndex].guestId;
      
      // Replace Placeholder
      trip.members[placeholderIndex].userId = userToInvite._id;
      trip.members[placeholderIndex].guestId = undefined;
      trip.members[placeholderIndex].name = userToInvite.name;
      trip.members[placeholderIndex].isGuest = false;
      trip.members[placeholderIndex].role = 'Member';

      // Migrate Expenses paid by this placeholder
      await Expense.updateMany(
        { tripId: trip._id, paidByGuestId: oldGuestId },
        { $set: { paidBy: userToInvite._id, paidByGuestId: null } }
      );
      
      // Migrate Expenses owed by this placeholder
      await Expense.updateMany(
        { tripId: trip._id, "participants.guestId": oldGuestId },
        { 
          $set: { 
            "participants.$[elem].userId": userToInvite._id,
            "participants.$[elem].guestId": null
          }
        },
        { arrayFilters: [{ "elem.guestId": oldGuestId }] }
      );
      
    } else {
      // No placeholders left, push a new member
      trip.members.push({
        userId: userToInvite._id,
        name: userToInvite.name,
        isGuest: false,
        role: 'Member'
      });
    }

    await trip.save();
    // Re-populate to send back the complete data
    await trip.populate('members.userId', 'name email');
    return res.status(200).json(trip);
  } catch (error) {
    return res.status(500).json({ error: "Failed to invite member" });
  }
};

// 9. Add a Guest user (No account required)
export const inviteGuest = async (req, res) => {
  try {
    const { name } = req.body;
    const trip = await Trip.findById(req.params.tripId).populate('members.userId', 'name email');
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    // Verify creator
    const isCreator = trip.members.find(m => m.userId?._id?.toString() === req.user._id.toString() && m.role === 'Creator');
    if (!isCreator) return res.status(403).json({ error: "Only the trip creator can add guests" });

    // 1. Find Placeholder
    const placeholderIndex = trip.members.findIndex(m => m.isGuest && m.name.startsWith('Traveler '));

    if (placeholderIndex !== -1) {
      // Just update the name (keep the existing guestId so expenses stay perfectly linked)
      trip.members[placeholderIndex].name = name || 'Guest User';
    } else {
      // Push new guest if no placeholders
      const guestId = 'guest-' + Math.random().toString(36).substring(2, 10);
      trip.members.push({
        guestId,
        name: name || 'Guest User',
        isGuest: true,
        role: 'Guest'
      });
    }

    await trip.save();
    return res.status(200).json(trip);
  } catch (error) {
    return res.status(500).json({ error: "Failed to add guest" });
  }
};

// 7. Handle Trip Details Update (Title/Destination)
export const updateTrip = async (req, res) => {
  try {
    const { title, destination } = req.body;
    
    // Check for exact name overlap again if title is changing
    if (title) {
      const existingTrips = await Trip.find({ "members.userId": req.user._id, _id: { $ne: req.params.tripId } });
      for (let t of existingTrips) {
        if (t.title.toLowerCase() === title.toLowerCase()) {
          return res.status(400).json({ error: "You already have another itinerary with this exact name." });
        }
      }
    }

    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.tripId, "members.userId": req.user._id },
      { title, destination },
      { new: true }
    );
    if (!trip) return res.status(404).json({ error: "Trip not found or unauthorized" });
    return res.status(200).json(trip);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update trip" });
  }
};

// 10. Remove a Participant
export const removeMember = async (req, res) => {
  try {
    const { tripId, memberId } = req.params;
    const trip = await Trip.findById(tripId).populate('members.userId', 'name email');
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    // Verify creator
    const isCreator = trip.members.find(m => m.userId?._id?.toString() === req.user._id.toString() && m.role === 'Creator');
    if (!isCreator) return res.status(403).json({ error: "Only the trip creator can remove participants" });

    // Find the member to remove
    const memberIndex = trip.members.findIndex(m => m._id.toString() === memberId);
    if (memberIndex === -1) return res.status(404).json({ error: "Member not found in this trip" });

    if (trip.members[memberIndex].role === 'Creator') {
      return res.status(400).json({ error: "Cannot remove the trip creator" });
    }

    trip.members.splice(memberIndex, 1);
    await trip.save();
    
    // Re-populate and return
    await trip.populate('members.userId', 'name email');
    return res.status(200).json(trip);
  } catch (error) {
    return res.status(500).json({ error: "Failed to remove participant" });
  }
};

// 11. Rename a Guest
export const renameGuest = async (req, res) => {
  try {
    const { tripId, memberId } = req.params;
    const { name } = req.body;
    
    const trip = await Trip.findById(tripId).populate('members.userId', 'name email');
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    // Verify creator
    const isCreator = trip.members.find(m => m.userId?._id?.toString() === req.user._id.toString() && m.role === 'Creator');
    if (!isCreator) return res.status(403).json({ error: "Only the trip creator can rename participants" });

    // Find the member
    const memberIndex = trip.members.findIndex(m => m._id.toString() === memberId);
    if (memberIndex === -1) return res.status(404).json({ error: "Member not found in this trip" });

    if (!trip.members[memberIndex].isGuest) {
      return res.status(400).json({ error: "Cannot rename a registered user" });
    }

    trip.members[memberIndex].name = name || 'Guest User';
    await trip.save();
    
    return res.status(200).json(trip);
  } catch (error) {
    return res.status(500).json({ error: "Failed to rename guest" });
  }
};