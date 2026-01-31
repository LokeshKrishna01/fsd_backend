import express from 'express';
import {
    getAllUsers,
    getUserById,
    grantAccess,
    revokeAccess,
    getAccessHistory,
    getUserAccessHistory
} from '../controllers/adminController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// User management
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserById);

// Access control - CRITICAL ENDPOINTS
router.post('/grant-access/:userId', grantAccess);
router.post('/revoke-access/:userId', revokeAccess);

// Audit logs
router.get('/access-history', getAccessHistory);
router.get('/access-history/:userId', getUserAccessHistory);

export default router;
