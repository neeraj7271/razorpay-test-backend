import express from 'express';
import { createOrder, capturePayment, verifyPayment, getPlans, createCustomer, createSubscription } from '../controllers/orderController.js';

const router = express.Router();

// Create order route
router.post('/create-customer', createCustomer);
router.post('/create-order', createOrder);

// Capture payment route
router.post('/capture-payment', capturePayment);
router.post('/verify-payment', verifyPayment);
router.get('/plans', getPlans);
router.post('/create-subscription', createSubscription);

export default router;