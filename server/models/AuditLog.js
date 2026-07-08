const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    username: { type: String, required: true },
    role: { type: String, required: true },
    ipAddress: { type: String, required: true },
    action: { type: String, required: true }, // e.g. LOGIN, LOGOUT, ASSIGNMENT_CREATED, ASSIGNMENT_DELETED, SUBMISSION_UPLOADED, SUBMISSION_DOWNLOADED, DUPLICATE_DETECTED, TEACHER_VIEWED_SUBMISSION, INTEGRITY_VERIFIED, EVALUATION_COMPLETED
    status: { type: String, required: true }, // Success, Failed, Flagged
    details: { type: String, default: '' }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
