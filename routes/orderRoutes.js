import express from 'express';
import { createOrder, capturePayment, verifyPayment } from '../controllers/orderController.js';

const router = express.Router();

// Create order route
router.post('/create-order', createOrder);

// Capture payment route
router.post('/capture-payment', capturePayment);
router.post('/verify-payment', verifyPayment);
router.get('/plans', getPlans);

export default router;