import User from '../models/User.js';
import AccessAudit from '../models/AccessAudit.js';

// @desc    Get all users with their access status
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .populate('accessGrantedBy', 'name email')
            .populate('accessRevokedBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:userId
// @access  Private/Admin
export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('-password')
            .populate('accessGrantedBy', 'name email')
            .populate('accessRevokedBy', 'name email');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Grant access to a user
// @route   POST /api/admin/grant-access/:userId
// @access  Private/Admin
export const grantAccess = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent granting access to another admin
        if (user.role === 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Cannot modify access status of admin users'
            });
        }

        // Check if already granted
        if (user.accessStatus === 'granted') {
            return res.status(400).json({
                success: false,
                message: 'User already has granted access'
            });
        }

        const previousStatus = user.accessStatus;

        // Update user access status
        user.accessStatus = 'granted';
        user.accessGrantedAt = new Date();
        user.accessGrantedBy = req.user._id;

        // Clear revocation fields if re-granting
        user.accessRevokedAt = undefined;
        user.accessRevokedBy = undefined;

        await user.save();

        // Create audit log
        await AccessAudit.create({
            userId: user._id,
            action: 'granted',
            performedBy: req.user._id,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('user-agent'),
            metadata: {
                previousStatus,
                newStatus: 'granted'
            }
        });

        res.status(200).json({
            success: true,
            message: 'Access granted successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                accessStatus: user.accessStatus,
                accessGrantedAt: user.accessGrantedAt,
                accessGrantedBy: req.user.name
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Revoke access from a user
// @route   POST /api/admin/revoke-access/:userId
// @access  Private/Admin
export const revokeAccess = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent revoking access from another admin
        if (user.role === 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Cannot modify access status of admin users'
            });
        }

        // Prevent self-revocation
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot revoke your own access'
            });
        }

        // Check if already revoked
        if (user.accessStatus === 'revoked') {
            return res.status(400).json({
                success: false,
                message: 'User access is already revoked'
            });
        }

        const previousStatus = user.accessStatus;

        // Update user access status
        user.accessStatus = 'revoked';
        user.accessRevokedAt = new Date();
        user.accessRevokedBy = req.user._id;

        await user.save();

        // Create audit log - CRITICAL FOR COMPLIANCE
        await AccessAudit.create({
            userId: user._id,
            action: 'revoked',
            performedBy: req.user._id,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('user-agent'),
            metadata: {
                previousStatus,
                newStatus: 'revoked',
                reason: req.body.reason || 'Not specified'
            }
        });

        res.status(200).json({
            success: true,
            message: 'Access revoked successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                accessStatus: user.accessStatus,
                accessRevokedAt: user.accessRevokedAt,
                accessRevokedBy: req.user.name
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get complete access history (audit log)
// @route   GET /api/admin/access-history
// @access  Private/Admin
export const getAccessHistory = async (req, res) => {
    try {
        const { userId, action, startDate, endDate, limit = 100, page = 1 } = req.query;

        // Build filter
        const filter = {};
        if (userId) filter.userId = userId;
        if (action) filter.action = action;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            AccessAudit.find(filter)
                .populate('userId', 'name email role')
                .populate('performedBy', 'name email')
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip(skip),
            AccessAudit.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            count: logs.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            logs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get access history for a specific user
// @route   GET /api/admin/access-history/:userId
// @access  Private/Admin
export const getUserAccessHistory = async (req, res) => {
    try {
        const logs = await AccessAudit.find({ userId: req.params.userId })
            .populate('performedBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: logs.length,
            logs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};
