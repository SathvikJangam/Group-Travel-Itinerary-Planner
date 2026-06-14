// server/controllers/expenseController.js
import Expense from '../models/Expense.js';
import Trip from '../models/Trip.js';

export const addExpense = async (req, res) => {
  try {
    const { tripId, description, category, totalAmount, splitType, selectedUserIds, exactParticipants, paidById } = req.body;
    
    let paidBy = null;
    let paidByGuestId = null;
    let paidByMultiple = false;

    if (paidById === 'MULTIPLE') {
      paidByMultiple = true;
    } else if (paidById && paidById.startsWith('guest-')) {
      paidByGuestId = paidById;
    } else {
      // Default to logged in user if not specified or is user
      paidBy = paidById || req.user._id;
    }

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    let participants = [];

    // Math for splitting
    if (splitType === 'EQUAL') {
      // Split among ALL members in the trip
      const splitAmount = totalAmount / trip.members.length;
      participants = trip.members.map(member => ({
        userId: member.userId || null,
        guestId: member.guestId || null,
        amountOwed: splitAmount
      }));
    } else if (splitType === 'CUSTOM') {
      // Split ONLY among the specific people selected
      // selectedUserIds could contain both userIds and guestIds now
      const splitAmount = totalAmount / selectedUserIds.length;
      participants = selectedUserIds.map(id => {
        const isGuest = id.startsWith('guest-');
        return {
          userId: isGuest ? null : id,
          guestId: isGuest ? id : null,
          amountOwed: splitAmount
        };
      });
    } else if (splitType === 'EXACT') {
      // exactParticipants array comes from frontend: [{ id: '...', amountOwed: 50 }, ...]
      let sum = 0;
      participants = exactParticipants.map(p => {
        sum += Number(p.amountOwed);
        const isGuest = p.id.startsWith('guest-');
        return {
          userId: isGuest ? null : p.id,
          guestId: isGuest ? p.id : null,
          amountOwed: Number(p.amountOwed)
        };
      });
      // Validate sum matches total amount (allow small floating point discrepancy)
      if (Math.abs(sum - totalAmount) > 0.1) {
        return res.status(400).json({ error: "The exact amounts do not tally up to the total bill amount." });
      }
    }

    const expense = new Expense({
      tripId,
      paidBy,
      paidByGuestId,
      paidByMultiple,
      description,
      category,
      totalAmount,
      splitType,
      participants
    });

    await expense.save();
    
    // Emit socket event if you want live updates for expenses too!
    if (req.io) req.io.to(tripId).emit("expense-added", expense);

    return res.status(201).json(expense);
  } catch (error) {
    console.error("Expense Error:", error);
    return res.status(500).json({ error: "Failed to add expense" });
  }
};

export const getTripExpenses = async (req, res) => {
  try {
    const { tripId } = req.params;
    const expenses = await Expense.find({ tripId })
      .populate('paidBy', 'name email')
      .populate('participants.userId', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json(expenses);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch expenses" });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.expenseId);
    if (!expense) return res.status(404).json({ error: "Expense not found" });

    const trip = await Trip.findById(expense.tripId);
    const isCreator = trip.members.find(m => m.userId?._id?.toString() === req.user._id.toString() && m.role === 'Creator');
    if (!isCreator) return res.status(403).json({ error: "Only the trip creator can delete expenses" });

    await expense.deleteOne();
    
    if (req.io) req.io.to(trip._id.toString()).emit("expense-deleted", req.params.expenseId);
    
    return res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete expense" });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { tripId, description, category, totalAmount, splitType, selectedUserIds, exactParticipants, paidById } = req.body;
    
    const expense = await Expense.findById(req.params.expenseId);
    if (!expense) return res.status(404).json({ error: "Expense not found" });

    const trip = await Trip.findById(tripId || expense.tripId);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const isCreator = trip.members.find(m => m.userId?._id?.toString() === req.user._id.toString() && m.role === 'Creator');
    if (!isCreator) return res.status(403).json({ error: "Only the trip creator can edit expenses" });

    let paidBy = null;
    let paidByGuestId = null;
    let paidByMultiple = false;

    if (paidById === 'MULTIPLE') {
      paidByMultiple = true;
    } else if (paidById && paidById.startsWith('guest-')) {
      paidByGuestId = paidById;
    } else {
      paidBy = paidById || req.user._id;
    }

    let participants = [];

    if (splitType === 'EQUAL') {
      const splitAmount = totalAmount / trip.members.length;
      participants = trip.members.map(member => ({
        userId: member.userId || null,
        guestId: member.guestId || null,
        amountOwed: splitAmount
      }));
    } else if (splitType === 'CUSTOM') {
      const splitAmount = totalAmount / selectedUserIds.length;
      participants = selectedUserIds.map(id => {
        const isGuest = id.startsWith('guest-');
        return {
          userId: isGuest ? null : id,
          guestId: isGuest ? id : null,
          amountOwed: splitAmount
        };
      });
    } else if (splitType === 'EXACT') {
      let sum = 0;
      participants = exactParticipants.map(p => {
        sum += Number(p.amountOwed);
        const isGuest = p.id.startsWith('guest-');
        return {
          userId: isGuest ? null : p.id,
          guestId: isGuest ? p.id : null,
          amountOwed: Number(p.amountOwed)
        };
      });
      if (Math.abs(sum - totalAmount) > 0.1) {
        return res.status(400).json({ error: "The exact amounts do not tally up to the total bill amount." });
      }
    }

    expense.paidBy = paidBy;
    expense.paidByGuestId = paidByGuestId;
    expense.paidByMultiple = paidByMultiple;
    expense.description = description;
    expense.category = category;
    expense.totalAmount = totalAmount;
    expense.splitType = splitType;
    expense.participants = participants;

    await expense.save();
    
    if (req.io) req.io.to(trip._id.toString()).emit("expense-updated", expense);

    return res.status(200).json(expense);
  } catch (error) {
    console.error("Expense Update Error:", error);
    return res.status(500).json({ error: "Failed to update expense" });
  }
};