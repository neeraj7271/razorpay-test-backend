import express from 'express';
import { createOrder, capturePayment, verifyPayment, getPlans, createCustomer, createSubscription, addAddonToSubscription, handleWebhook, validateDiscount, getCustomers, getUserSubscriptions, getSubscriptionDetails, getTransactionHistory, checkSubscriptionStatus } from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/plans', getPlans);
router.post('/webhook', handleWebhook);

// Protected routes that require authentication
router.post('/create-customer', protect, createCustomer);//?done testing;
router.post('/create-order', protect, createOrder);//?done testing;
router.post('/verify-payment', protect, verifyPayment);//?done testing;
router.post('/create-subscription', protect, createSubscription);//?done testing;
router.post('/add-addon', protect, addAddonToSubscription);//?no need

// New protected routes
router.get('/validate-discount/:subscriptionId', protect, validateDiscount);
router.get('/customers', protect, getCustomers); //?done testing;
router.get('/subscriptions', protect, getUserSubscriptions);
router.get('/subscriptions/:subscriptionId', protect, getSubscriptionDetails);
router.get('/transactions', protect, getTransactionHistory);
router.post('/check-subscription/:subscriptionId', protect, checkSubscriptionStatus);

// This route is typically called by Razorpay, not the frontend
router.post('/capture-payment', capturePayment);

export default router;