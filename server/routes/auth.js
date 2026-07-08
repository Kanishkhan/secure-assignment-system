const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/User'); // [MODIFY] Mongoose Model
const AuditLog = require('../models/AuditLog');

const SECRET_KEY = process.env.JWT_SECRET;

// 1. REGISTER (Salted Hashing)
// 1.1 Single-Factor Authentication:
// Implementation using password/username-based login (see login route)

// 4.1 Hashing with Salt:
// Application uses bcrypt for secure password hashing with automatically generated salt.
// NIST recommended high work factor is used.
router.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;

    // NIST recommended: high work factor. Async bcrypt handles salt generation automatically.
    // Salt is stored as part of the hash string in bcrypt format.
    try {
        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            role: role || 'student'
        });

        res.status(201).json({ message: 'User registered successfully', userId: newUser._id });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Username or Email already exists' });
        }
        res.status(500).json({ error: 'Registration failed: ' + error.message });
    }
});

// 1.1 Single-Factor Authentication:
// Login route implements username/password verification.
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    try {
        const user = await User.findOne({ username });
        if (!user) {
            await AuditLog.create({
                username: username || 'unknown',
                role: 'unknown',
                ipAddress: ip,
                action: 'LOGIN',
                status: 'Failed',
                details: 'Login failed: Username not found'
            });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            await AuditLog.create({
                userId: user._id,
                username: user.username,
                role: user.role,
                ipAddress: ip,
                action: 'LOGIN',
                status: 'Failed',
                details: 'Login failed: Incorrect password'
            });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.mfa_enabled) {
            return res.json({ mfaRequired: true, userId: user._id });
        }

        // Generate JWT (Include mfa_enabled status)
        const token = jwt.sign({ id: user._id, role: user.role, username: user.username, mfa_enabled: user.mfa_enabled }, SECRET_KEY, { expiresIn: '1h' });
        
        await AuditLog.create({
            userId: user._id,
            username: user.username,
            role: user.role,
            ipAddress: ip,
            action: 'LOGIN',
            status: 'Success',
            details: 'Login successful via password'
        });

        res.json({ token, role: user.role, mfaRequired: false });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed: ' + err.message });
    }
});

// 1.2 Multi-Factor Authentication:
// Implementation using TOTP (Time-based One-Time Password).
// This route generates a new secret and QR code for the user to scan.
router.post('/mfa/setup', async (req, res) => {
    const secret = speakeasy.generateSecret({ name: "SecureAssignmentSystem" });
    try {
        const qrCode = await qrcode.toDataURL(secret.otpauth_url);
        res.json({ secret: secret.base32, otpauth_url: secret.otpauth_url, qrCode });
    } catch (err) {
        res.status(500).json({ error: 'Error generating QR Code' });
    }
});

router.post('/mfa/enable', async (req, res) => {
    const { userId, secret, token } = req.body;

    // Verify token first
    const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow +/- 2 step (1 min) drift for robustness
    });

    if (verified) {
        try {
            const user = await User.findByIdAndUpdate(userId, { mfa_secret: secret, mfa_enabled: true }, { new: true });
            if (!user) return res.status(404).json({ error: 'User not found' });

            // Generate NEW Token with mfa_enabled: 1
            const newToken = jwt.sign({ id: user._id, role: user.role, username: user.username, mfa_enabled: true }, SECRET_KEY, { expiresIn: '1h' });
            res.json({ message: 'MFA Enabled', token: newToken });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    } else {
        res.status(400).json({ error: 'Invalid MFA Token' });
    }
});

// 1.2 Multi-Factor Authentication:
// This route validates the second factor (TOTP) during the login process.
router.post('/mfa/verify', async (req, res) => {
    const { userId, token } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    try {
        const user = await User.findById(userId);
        if (!user) {
            await AuditLog.create({
                username: 'unknown',
                role: 'unknown',
                ipAddress: ip,
                action: 'LOGIN',
                status: 'Failed',
                details: 'MFA login failed: User not found'
            });
            return res.status(401).json({ error: 'User not found' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow +/- 2 step (1 min) drift for robustness
        });

        if (verified) {
            const jwtToken = jwt.sign({ id: user._id, role: user.role, username: user.username, mfa_enabled: true }, SECRET_KEY, { expiresIn: '1h' });
            
            await AuditLog.create({
                userId: user._id,
                username: user.username,
                role: user.role,
                ipAddress: ip,
                action: 'LOGIN',
                status: 'Success',
                details: 'Login successful via password + MFA verification'
            });

            res.json({ token: jwtToken, role: user.role, success: true });
        } else {
            await AuditLog.create({
                userId: user._id,
                username: user.username,
                role: user.role,
                ipAddress: ip,
                action: 'LOGIN',
                status: 'Failed',
                details: 'Login failed: Invalid MFA Code'
            });
            res.status(401).json({ error: 'Invalid MFA Code' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const { authenticateToken, authorizeRole } = require('../middleware/auth');

// 5. ADMIN: Get All Users
router.get('/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const users = await User.find({}, 'username email role mfa_enabled');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. ADMIN: Delete User
router.delete('/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    const userId = req.params.id;
    // Prevent deleting self
    if (userId === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });

    try {
        await User.findByIdAndDelete(userId);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// LOGOUT: Audit and clear session logging
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        await AuditLog.create({
            userId: req.user.id,
            username: req.user.username,
            role: req.user.role,
            ipAddress: ip,
            action: 'LOGOUT',
            status: 'Success',
            details: 'User logged out successfully'
        });
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        console.error('Logout audit error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
