// server/models/Expense.js
import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paidByGuestId: { type: String },
  paidByMultiple: { type: Boolean, default: false },
  description: { type: String, required: true },
  category: { type: String, enum: ['Food', 'Transport', 'Stay', 'Activity', 'Other'], default: 'Other' },
  totalAmount: { type: Number, required: true },
  splitType: { type: String, enum: ['EQUAL', 'CUSTOM', 'EXACT'], default: 'EQUAL' },
  
  // Exact amounts owed by each person involved
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional if guest
    guestId: { type: String }, // Used if guest
    amountOwed: { type: Number, required: true }
  }]
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);