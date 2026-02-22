const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./database/db'); // [MODIFY]
const authRoutes = require('./routes/auth');
const assignmentRoutes = require('./routes/assignments');

require('dotenv').config();

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
app.use(cors({
    origin: [
        "http://localhost:5173",
        process.env.FRONTEND_URL,
        "https://secure-assignment-system-dh7lhahxg-kanishkhans-projects.vercel.app"
    ].filter(Boolean),
    credentials: true
}));
app.use(express.json());
app.use(limiter); // Apply rate limiting to all requests

// Initialize Database
connectDB(); // [MODIFY]

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);

// Serve uploads (securely - usually you wouldn't serve this static for sensitive files, but for demo we will control via routes)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root Route (Health Check)
app.get('/', (req, res) => {
    res.send('Secure Assignment System API is running...');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
