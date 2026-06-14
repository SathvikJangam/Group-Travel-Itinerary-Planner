// server/routes/packageRoutes.js
import express from 'express';
import { 
  searchPackages, 
  getAdminPackages, 
  createPackage, 
  updatePackage, 
  deletePackage 
} from '../controllers/packageController.js';
import { protect, adminCheck } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Publicly readable for standard users
router.get('/', protect, searchPackages);

// ADMIN ONLY ROUTES
router.get('/admin', protect, adminCheck, getAdminPackages);
router.post('/', protect, adminCheck, createPackage);
router.put('/:id', protect, adminCheck, updatePackage);
router.delete('/:id', protect, adminCheck, deletePackage);

export default router;