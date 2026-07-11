const jwt = require('jsonwebtoken');

// Reads JWT secret at request time to avoid dotenv timing issues
const getSecret = () => process.env.JWT_SECRET || 'super_secret_assignment_system_2026_key';

// Verifies the user's JWT before allowing access to protected routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    // Also support token from query params (for direct browser downloads via window.open)
    if (!token && req.query.token) {
        token = req.query.token;
    }

    if (!token) return res.sendStatus(401);

    jwt.verify(token, getSecret(), (err, user) => {
        if (err) {
            console.error('JWT Verify Error:', err.message);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

// Checks if the authenticated user has the required role(s)
// Roles: 'student' | 'teacher' | 'admin'
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access Denied: Insufficient Permissions' });
        }
        next();
    };
};

module.exports = { authenticateToken, authorizeRole };
