// server/routes/expenseRoutes.js
import express from 'express';
import { addExpense, getTripExpenses, deleteExpense, updateExpense } from '../controllers/expenseController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', protect, addExpense);
router.get('/:tripId', protect, getTripExpenses);
router.put('/:expenseId', protect, updateExpense);
router.delete('/:expenseId', protect, deleteExpense);

export default router;