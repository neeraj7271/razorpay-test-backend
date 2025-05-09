import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { createPlan } from './controllers/adminController.js';
import crypto from 'crypto';
import bodyParser from 'body-parser';
import { rawBodyCapture } from './middleware/rawBodyCapture.js';
import { handleWebhook } from './controllers/orderController.js';

dotenv.config();

// Connect to MongoDB
await connectDB();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000', 'http://localhost:5173', 'http://localhost'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature'],
    credentials: true
}));

// Special handling for webhook route - needs raw body for signature verification
app.post('/api/webhook', rawBodyCapture, handleWebhook);

// Regular middleware for other routes
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', orderRoutes);
app.use('/api/admin', adminRoutes);

// Razorpay direct endpoints (no auth for easier frontend integration)
app.post('/api/razorpay/create-plan', createPlan);

// Basic route for testing
app.get('/', (req, res) => {
    res.send('Razorpay Integration API is running!');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// For Vercel
export default app;