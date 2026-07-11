require('dotenv').config(); // MUST be first — loads .env before any module reads process.env

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./database/db');
const authRoutes = require('./routes/auth');
const assignmentRoutes = require('./routes/assignments');
const analyticsRoutes = require('./routes/analytics');
const similarityRoutes = require('./routes/similarity');

const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1); // Required for Render + express-rate-limit
const PORT = process.env.PORT || 5000;

// Rate Limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased for dev
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Security Middleware
app.use(helmet()); // Sets various HTTP headers for security
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [])
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        // Allow any configured origin or Vercel preview URLs
        if (
            allowedOrigins.includes(origin) ||
            (origin.includes('secure-assignment-system') && origin.includes('vercel.app'))
        ) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS: ' + origin));
        }
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length']
}));
app.use(express.json());
app.use(limiter); // Apply rate limiting to all requests

connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/similarity', similarityRoutes);


// Root Route (Health Check)
app.get('/', (req, res) => {
    res.send('Secure Assignment System API is running...');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
