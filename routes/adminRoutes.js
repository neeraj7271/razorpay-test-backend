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
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

// Subscription management routes
router.get('/subscriptions', getAllSubscriptions);
router.post('/subscriptions/:subscriptionId/discount', applyDiscount);
router.post('/subscriptions/:subscriptionId/extend', extendSubscription);

export default router; 