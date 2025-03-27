import express from 'express';
import { createOrder, capturePayment } from '../controllers/orderController.js';

const router = express.Router();

// Create order route
router.post('/create-order', createOrder);

// Capture payment route
router.post('/capture-payment', capturePayment);

export default router;