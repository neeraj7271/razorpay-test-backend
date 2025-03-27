import express from 'express';
import { createOrder } from '../controllers/orderController.js';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Order routes are working' });
});

// Create order route
router.post('/create-order', createOrder);




export default router;