import express from 'express';
import { createOrder, capturePayment } from '../controllers/orderController.js';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Order routes are working' });
});

// Create order route
router.post('/create-order', createOrder);

router.post('/capture-payment', capturePayment);


export default router;