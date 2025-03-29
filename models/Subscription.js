import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
    {
        razorpaySubscriptionId: {
            type: String,
            required: true,
            unique: true,
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true,
        },
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Plan',
            required: true,
        },
        status: {
            type: String,
            enum: ['created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired'],
            default: 'created',
        },
        currentPeriodStart: {
            type: Date,
        },
        currentPeriodEnd: {
            type: Date,
        },
        totalCount: {
            type: Number,
            default: 12,
        },
        paidCount: {
            type: Number,
            default: 0,
        },
        addons: [
            {
                razorpayAddonId: String,
                name: String,
                amount: Number,
                quantity: Number,
            },
        ],
        discount: {
            amount: Number,
            type: {
                type: String,
                enum: ['percentage', 'fixed'],
                default: 'percentage'
            },
            appliedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            appliedAt: Date,
            notes: String
        },
        extensionHistory: [
            {
                months: Number,
                extendedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                extendedAt: Date,
                previousEndDate: Date,
                newEndDate: Date,
                reason: String
            }
        ],
        notes: {
            type: Object,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription; 