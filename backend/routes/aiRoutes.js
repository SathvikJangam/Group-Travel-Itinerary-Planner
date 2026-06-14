import express from 'express';
import { generateBudgetEstimate, handleTripCoPilotChat, generateCustomPackage } from '../controllers/aiController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/budget', protect, generateBudgetEstimate);

router.post('/generate-package', protect, generateCustomPackage);

router.post('/:tripId/chat', protect, handleTripCoPilotChat);

export default router;