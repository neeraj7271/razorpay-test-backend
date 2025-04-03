import express from 'express';
import { createOrder, capturePayment, verifyPayment, getPlans, createCustomer, createSubscription, getCustomers, getUserSubscriptions, getSubscriptionDetails, getTransactionHistory, checkSubscriptionStatus } from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/plans', getPlans);

// Note: Webhook route is now handled directly in index.js with the rawBodyCapture middleware

// Protected routes that require authentication
router.post('/create-customer', createCustomer);
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);
router.post('/create-subscription', createSubscription);
// router.post('/add-addon', protect, addAddonToSubscription);
//!renew subscription

// New protected routes
// router.get('/validate-discount/:subscriptionId', protect, validateDiscount);
router.get('/customers', getCustomers);
router.get('/subscriptions', getUserSubscriptions);
router.get('/subscriptions/:subscriptionId', getSubscriptionDetails);
router.get('/transactions', getTransactionHistory);
router.post('/check-subscription/:subscriptionId', checkSubscriptionStatus);

// This route is typically called by Razorpay, not the frontend
router.post('/capture-payment', capturePayment);

export default router;