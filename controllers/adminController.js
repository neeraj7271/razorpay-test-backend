import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import Plan from '../models/Plan.js';
import Subscription from '../models/Subscription.js';
import Customer from '../models/Customer.js';

dotenv.config();
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create a new plan
// @route   POST /api/admin/plans
// @access  Admin
export const createPlan = async (req, res) => {
    try {
        const {
            name,
            description,
            amount,
            currency = 'INR',
            interval = 'month',
            intervalCount = 1,
            features = []
        } = req.body;

        // Validate input
        if (!name || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name and amount for the plan'
            });
        }

        // Create plan in Razorpay
        const razorpayPlan = await razorpay.plans.create({
            period: interval,
            interval: intervalCount,
            item: {
                name,
                description: description || name,
                amount: amount * 100,
                currency
            }
        });

        // Create plan in MongoDB
        const plan = new Plan({
            razorpayPlanId: razorpayPlan.id,
            name,
            description: description || name,
            amount,
            currency,
            interval,
            intervalCount,
            features,
            isActive: true
        });

        await plan.save();

        res.status(201).json({
            success: true,
            plan
        });
    } catch (error) {
        console.error('Error creating plan:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create plan',
            error: error.message
        });
    }
};

// @desc    Update plan
// @route   PUT /api/admin/plans/:id
// @access  Admin
//! No need to use it: as its the permanent plan and we can't update it in razorpay
export const updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            amount,
            currency,
            features,
            isActive
        } = req.body;

        // Find plan in MongoDB
        const plan = await Plan.findById(id);
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            });
        }

        // Update local plan fields
        if (name) plan.name = name;
        if (description) plan.description = description;
        if (amount) plan.amount = amount;
        if (currency) plan.currency = currency;
        if (features) plan.features = features;
        if (isActive !== undefined) plan.isActive = isActive;

        // Save updated plan
        await plan.save();

        // Note: We can't update core plan details in Razorpay once created
        // If pricing changes are needed, typically a new plan is created
        // and existing subscriptions are migrated or updated

        res.status(200).json({
            success: true,
            plan
        });
    } catch (error) {
        console.error('Error updating plan:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update plan',
            error: error.message
        });
    }
};

// @desc    Delete a plan
// @route   DELETE /api/admin/plans/:id
// @access  Admin
export const deletePlan = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the plan
        const plan = await Plan.findById(id);
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            });
        }

        // Check if the plan has any active subscriptions
        const subscriptions = await Subscription.find({ planId: id, status: 'active' });
        if (subscriptions.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete plan with active subscriptions',
                activeSubscriptionsCount: subscriptions.length
            });
        }

        // Delete the plan
        await Plan.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Plan deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting plan:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete plan',
            error: error.message
        });
    }
};

// @desc    Apply discount to subscription
// @route   POST /api/admin/subscriptions/:subscriptionId/discount
// @access  Admin
export const applyDiscount = async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const { discountAmount, discountType = 'percentage', notes } = req.body;

        // Validate discount
        if (!discountAmount || discountAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid discount amount'
            });
        }

        // Find subscription in DB
        const subscription = await Subscription.findOne({ razorpaySubscriptionId: subscriptionId });
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        // Apply discount via Razorpay offer/custom offer
        // For Razorpay this is usually done via creating an offer and applying to the subscription
        // or by applying a custom offer directly to an invoice

        // For this implementation, we'll create a direct credit/discount in Razorpay
        // This is usually done by creating a credit note when an invoice is generated

        // Store the discount information in our DB
        subscription.discount = {
            amount: discountAmount,
            type: discountType,
            appliedBy: req.user.id,
            appliedAt: new Date(),
            notes: notes || 'Admin applied discount'
        };

        await subscription.save();

        res.status(200).json({
            success: true,
            message: 'Discount applied successfully',
            subscription
        });
    } catch (error) {
        console.error('Error applying discount:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to apply discount',
            error: error.message
        });
    }
};

// @desc    Extend subscription period
// @route   POST /api/admin/subscriptions/:subscriptionId/extend
// @access  Admin
export const extendSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const { extensionMonths, reason } = req.body;

        // Validate extension
        if (!extensionMonths || extensionMonths <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid extension period in months'
            });
        }

        // Find subscription in DB
        const subscription = await Subscription.findOne({ razorpaySubscriptionId: subscriptionId });
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        // Calculate new end date
        const currentEndDate = new Date(subscription.currentPeriodEnd);
        const newEndDate = new Date(currentEndDate);
        newEndDate.setMonth(newEndDate.getMonth() + extensionMonths);

        // Update subscription in Razorpay
        // Note: For actual implementation, you might need to handle this differently
        // depending on Razorpay's API capabilities (e.g., pause and resume strategies)
        // This is a simplified version

        // Update our database
        subscription.currentPeriodEnd = newEndDate;
        subscription.extensionHistory = subscription.extensionHistory || [];
        subscription.extensionHistory.push({
            months: extensionMonths,
            extendedBy: req.user.id,
            extendedAt: new Date(),
            previousEndDate: currentEndDate,
            newEndDate: newEndDate,
            reason: reason || 'Admin extension'
        });

        await subscription.save();

        res.status(200).json({
            success: true,
            message: `Subscription extended by ${extensionMonths} months`,
            subscription
        });
    } catch (error) {
        console.error('Error extending subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to extend subscription',
            error: error.message
        });
    }
};

// @desc    Get all subscriptions
// @route   GET /api/admin/subscriptions
// @access  Admin
export const getAllSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find()
            .populate('customerId', 'name email contact')
            .populate('planId', 'name amount currency interval');

        res.status(200).json({
            success: true,
            count: subscriptions.length,
            data: subscriptions
        });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscriptions',
            error: error.message
        });
    }
}; 