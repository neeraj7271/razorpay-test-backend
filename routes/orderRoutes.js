import express from 'express';
import { createOrder, capturePayment, verifyPayment, getPlans, createCustomer, createSubscription, addAddonToSubscription, validateDiscount, getCustomers, getUserSubscriptions, getSubscriptionDetails, getTransactionHistory, checkSubscriptionStatus } from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/plans', getPlans);

// Note: Webhook route is now handled directly in index.js with the rawBodyCapture middleware

// Protected routes that require authentication
router.post('/create-customer', protect, createCustomer);
router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);
router.post('/create-subscription', protect, createSubscription);
// router.post('/add-addon', protect, addAddonToSubscription);
//!renew subscription

// New protected routes
// router.get('/validate-discount/:subscriptionId', protect, validateDiscount);
router.get('/customers', protect, getCustomers);
router.get('/subscriptions', protect, getUserSubscriptions);
router.get('/subscriptions/:subscriptionId', protect, getSubscriptionDetails);
router.get('/transactions', protect, getTransactionHistory);
router.post('/check-subscription/:subscriptionId', protect, checkSubscriptionStatus);

// This route is typically called by Razorpay, not the frontend
router.post('/capture-payment', capturePayment);

export default router;