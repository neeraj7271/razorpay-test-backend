import express from 'express';
import {
    createPlan,
    updatePlan,
    applyDiscount,
    extendSubscription,
    getAllSubscriptions,
    deletePlan
} from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/admin.js';

const router = express.Router();

// Apply both auth middleware (protect) and admin middleware
router.use(protect);
router.use(isAdmin);

// Plan routes
router.post('/plans', createPlan); //?done testing
router.put('/plans/:id', updatePlan); //no need
router.delete('/plans/:id', deletePlan);//not

// Subscription management routes
router.get('/subscriptions', getAllSubscriptions); //?done testing
router.post('/subscriptions/:subscriptionId/discount', applyDiscount); //!NEED TO REVIEW AND TEST
router.post('/subscriptions/:subscriptionId/extend', extendSubscription); //!NEED TO REVIEW AND TEST

export default router; 