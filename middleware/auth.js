import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Verify JWT and check user access status
export const protect = async (req, res, next) => {
    try {
        let token;

        // Get token from cookie or header
        if (req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: No token provided'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const user = await User.findById(decoded.id).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User not found'
            });
        }

        // CRITICAL: Check access status from database on EVERY request
        // This ensures revoked access is enforced immediately
        if (user.accessStatus !== 'granted') {
            let message = 'Access denied';
            if (user.accessStatus === 'pending') {
                message = 'Access pending: Awaiting admin approval';
            } else if (user.accessStatus === 'revoked') {
                message = 'Access has been revoked. Contact administrator.';
            }
            return res.status(403).json({
                success: false,
                message
            });
        }

        // Attach user to request (without password)
        user.password = undefined;
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Invalid token'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Token expired'
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Restrict to specific roles (must be used after protect middleware)
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: This action requires ${roles.join(' or ')} role`
            });
        }
        next();
    };
};
