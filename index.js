import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { createPlan } from './controllers/adminController.js';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import xss from 'xss-clean';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { fileURLToPath } from 'url';
import path from 'path';
import { handleWebhook } from './controllers/orderController.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*', // Be more specific in production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Middleware to capture raw body for webhook verification
app.post('/api/webhook', (req, res, next) => {
    let rawBody = '';
    req.on('data', (chunk) => {
        rawBody += chunk.toString();
    });

    req.on('end', () => {
        req.rawBody = rawBody;
        next();
    });
}, handleWebhook);

// Body parser middleware - MUST come AFTER the raw body middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Routes
app.use('/api', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Razorpay direct endpoints (no auth for easier frontend integration)
app.post('/api/razorpay/create-plan', createPlan);

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Razorpay API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

// For Vercel
export default app;