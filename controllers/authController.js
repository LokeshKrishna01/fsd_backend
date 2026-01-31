import User from '../models/User.js';
import AccessAudit from '../models/AccessAudit.js';
import { generateToken, setTokenCookie } from '../utils/jwt.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create user with pending access status
        const user = await User.create({
            name,
            email,
            password,
            phone,
            role: 'user',
            accessStatus: 'pending'
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully. Awaiting admin approval.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                accessStatus: user.accessStatus
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

// @desc    Register a new admin
// @route   POST /api/auth/register-admin
// @access  Public (with admin code)
export const registerAdmin = async (req, res) => {
    try {
        const { name, email, password, phone, adminCode } = req.body;

        // Verify admin code
        if (adminCode !== process.env.ADMIN_CODE) {
            return res.status(403).json({
                success: false,
                message: 'Invalid admin code'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create admin with granted access
        const user = await User.create({
            name,
            email,
            password,
            phone,
            role: 'admin',
            accessStatus: 'granted',
            accessGrantedAt: new Date()
        });

        res.status(201).json({
            success: true,
            message: 'Admin registered successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                accessStatus: user.accessStatus
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

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const ipAddress = req.ip || req.connection?.remoteAddress;
        const userAgent = req.get('user-agent');

        // Get user with password
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordMatch = await user.comparePassword(password);

        if (!isPasswordMatch) {
            // Log failed login attempt
            await AccessAudit.create({
                userId: user._id,
                action: 'login_failed',
                ipAddress,
                userAgent,
                metadata: { reason: 'Invalid password' }
            });

            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // CRITICAL: Check access status before issuing token
        if (user.accessStatus === 'pending') {
            await AccessAudit.create({
                userId: user._id,
                action: 'access_denied',
                ipAddress,
                userAgent,
                metadata: { reason: 'Access pending admin approval' }
            });

            return res.status(403).json({
                success: false,
                message: 'Access pending: Awaiting admin approval'
            });
        }

        if (user.accessStatus === 'revoked') {
            await AccessAudit.create({
                userId: user._id,
                action: 'access_denied',
                ipAddress,
                userAgent,
                metadata: { reason: 'Access has been revoked' }
            });

            return res.status(403).json({
                success: false,
                message: 'Access has been revoked. Please contact administrator.'
            });
        }

        // Log successful login
        await AccessAudit.create({
            userId: user._id,
            action: 'login_success',
            ipAddress,
            userAgent
        });

        // Generate token and set cookie
        const token = generateToken(user._id);
        setTokenCookie(res, token);

        // Remove password from response
        user.password = undefined;

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                accessStatus: user.accessStatus
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

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = async (req, res) => {
    res.status(200).json({
        success: true,
        user: req.user
    });
};

// @desc    Get current user's access status
// @route   GET /api/auth/status
// @access  Private
export const getAccessStatus = async (req, res) => {
    res.status(200).json({
        success: true,
        accessStatus: {
            status: req.user.accessStatus,
            grantedAt: req.user.accessGrantedAt,
            grantedBy: req.user.accessGrantedBy,
            revokedAt: req.user.accessRevokedAt,
            revokedBy: req.user.accessRevokedBy
        }
    });
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logoutUser = async (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0)
    });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};
