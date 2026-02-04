const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed
    // 2.1 Access Control Model:
    // User roles (Student, Teacher, Admin) defined here for RBAC.
    role: { type: String, enum: ['admin', 'teacher', 'student'], default: 'student' },
    mfa_secret: { type: String },
    mfa_enabled: { type: Boolean, default: false }
});

userSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) { delete ret._id; }
});

module.exports = mongoose.model('User', userSchema);
