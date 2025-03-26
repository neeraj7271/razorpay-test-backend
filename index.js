import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import orderRoutes from './routes/orderRoutes.js';

dotenv.config();

const app = express();

// Enable CORS
app.use(cors({
    origin: '*', // Be more specific in production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());

// Routes
app.use('/api', orderRoutes);

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
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

// For Vercel
export default app;