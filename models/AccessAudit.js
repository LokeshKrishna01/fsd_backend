import mongoose from 'mongoose';

const accessAuditSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        enum: ['granted', 'revoked', 'login_success', 'login_failed', 'access_denied'],
        required: true
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // null for self-initiated actions like login attempts
        default: null
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        // Additional context like reason, previous status, etc.
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }  // Only track creation time
});

// Prevent updates to audit logs - they should be immutable
accessAuditSchema.pre('save', function (next) {
    if (!this.isNew) {
        const error = new Error('Audit logs cannot be modified after creation');
        return next(error);
    }
    next();
});

// Index for faster queries
accessAuditSchema.index({ userId: 1, createdAt: -1 });
accessAuditSchema.index({ action: 1, createdAt: -1 });

const AccessAudit = mongoose.model('AccessAudit', accessAuditSchema);

export default AccessAudit;
