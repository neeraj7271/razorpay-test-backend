import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import orderRoutes from './routes/orderRoutes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
    origin: '*', // Be more specific in production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// const cors = require('cors');
// app.use(cors({
//     origin: 'razorpay-test-frontend-wine.vercel.app' // Replace with your frontend URL
// }));

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

// For Vercel, we export the app instead of listening directly
export default app;

// For local development, you can still listen on a port
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server is running on the port ${port}`);
    });
}