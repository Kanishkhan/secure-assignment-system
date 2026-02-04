const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_jwt_key_should_be_long';

// 2.3 Implementation of Access Control:
// The system implements access control programmatically using middleware functions.
// 1. authenticateToken: Verifies the user's identity via JWT before allowing access.
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    //Multi-Factor Authentication 

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            console.error('JWT Verify Error:', err.message);
            return res.sendStatus(403);
        }
        console.log('Auth Middleware User:', user);
        console.log('Auth Middleware User:', user);
        req.user = user;
        next();
    });
};

// Single-Factor Authentication




//Access Control Model 
// 2.1 Access Control Model:
// Implements Access Control List (ACL) with minimum 3 subjects (Admin, Teacher, Student).

// 2.2 Policy Definition & Justification:
// Policy: The system enforces Role-Based Access Control (RBAC).
// Justification:
// - 'Student': Submit assignments, View own.
// - 'Teacher': Create assignments, View all submissions.
// - 'Admin': Full access.
// This separation of duties prevents unauthorized access.

// 2.3 Implementation of Access Control (Part 2):
// 2. authorizeRole: checks if the authenticated user has the required permission level.
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access Denied: Insufficient Permissions' });
        }
        next();
    };
};

//Access Control Model 

module.exports = { authenticateToken, authorizeRole };
