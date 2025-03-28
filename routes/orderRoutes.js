import express from 'express';
import { createOrder, capturePayment, verifyPayment, getPlans, createCustomer, createSubscription, addAddonToSubscription, handleWebhook } from '../controllers/orderController.js';

const router = express.Router();

// Create order route
router.post('/create-customer', createCustomer);
router.post('/create-order', createOrder);

// Capture payment route
//capture payment will not be used in the frontend as it is automatically called when the payment is captured
router.post('/capture-payment', capturePayment);
//verify payment
router.post('/verify-payment', verifyPayment);
//get plans
router.get('/plans', getPlans);
//create subscription
router.post('/create-subscription', createSubscription);
//add addon to subscription
router.post('/add-addon', addAddonToSubscription);
//handle webhook
router.post('/webhook', handleWebhook);

export default router;