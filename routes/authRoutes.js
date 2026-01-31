import express from 'express';
import {
    registerUser,
    registerAdmin,
    loginUser,
    getCurrentUser,
    getAccessStatus,
    logoutUser
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import {
    registerValidation,
    adminRegisterValidation,
    loginValidation,
    validateRequest
} from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.post('/register', registerValidation, validateRequest, registerUser);
router.post('/register-admin', adminRegisterValidation, validateRequest, registerAdmin);
router.post('/login', loginValidation, validateRequest, loginUser);

// Protected routes
router.get('/me', protect, getCurrentUser);
router.get('/status', protect, getAccessStatus);
router.post('/logout', protect, logoutUser);

export default router;
