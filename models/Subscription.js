import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
    razorpaySubscriptionId: {
        type: String,
        required: true,
        unique: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
        required: true
    },
    status: {
        type: String,
        enum: ['created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired'],
        default: 'created'
    },
    startAt: {
        type: Date,
        default: null
    },
    currentPeriodStart: {
        type: Date,
        default: null
    },
    currentPeriodEnd: {
        type: Date,
        default: null
    },
    chargeAt: {
        type: Date,
        default: null
    },
    endAt: {
        type: Date,
        default: null
    },
    totalCount: {
        type: Number,
        default: 0
    },
    paidCount: {
        type: Number,
        default: 0
    },
    authAttempts: {
        type: Number,
        default: 0
    },
    billingPeriod: {
        type: String,
        enum: ['yearly', 'quarterly', 'monthly'],
        default: 'yearly'
    },
    addons: [{
        razorpayAddonId: String,
        name: String,
        amount: Number,
        quantity: Number
    }],
    discount: {
        type: {
            type: String,
            enum: ['flat', 'percentage'],
            default: 'flat'
        },
        amount: Number,
        appliedAt: Date,
        notes: Object
    },
    notes: {
        type: Object,
        default: {}
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Subscription', SubscriptionSchema); 