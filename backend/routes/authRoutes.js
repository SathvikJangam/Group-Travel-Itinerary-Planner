import express from 'express';
import { loginUser, registerUser, updateProfile } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', loginUser); 
router.post('/register', registerUser);
router.put('/profile', protect, updateProfile);

export default router;