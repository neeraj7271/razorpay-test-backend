import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
    // razorpaySubscriptionId: {
    //     type: String,
    //     required: true,
    //     unique: true
    // },
    // customerId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Customer',
    //     required: true
    // },
    // planId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Plan',
    //     required: true
    // },
    // status: {
    //     type: String,
    //     enum: ['created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired'],
    //     default: 'created'
    // },
    // startAt: {
    //     type: Date,
    //     default: null
    // },
    // currentPeriodStart: {
    //     type: Date,
    //     default: null
    // },
    // currentPeriodEnd: {
    //     type: Date,
    //     default: null
    // },
    // chargeAt: {
    //     type: Date,
    //     default: null
    // },
    // endAt: {
    //     type: Date,
    //     default: null
    // },
    // totalCount: {
    //     type: Number,
    //     default: 0
    // },
    // paidCount: {
    //     type: Number,
    //     default: 0
    // },
    // authAttempts: {
    //     type: Number,
    //     default: 0
    // },
    // billingPeriod: {
    //     type: String,
    //     enum: ['yearly', 'quarterly', 'monthly'],
    //     default: 'yearly'
    // },
    // addons: [{
    //     razorpayAddonId: String,
    //     name: String,
    //     amount: Number,
    //     quantity: Number
    // }],
    // discount: {
    //     type: {
    //         type: String,
    //         enum: ['flat', 'percentage'],
    //         default: 'flat'
    //     },
    //     amount: Number,
    //     appliedAt: Date,
    //     notes: Object
    // },
    // notes: {
    //     type: Object,
    //     default: {}
    // },
    // isActive: {
    //     type: Boolean,
    //     default: true
    // }

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
        type: Date
    },
    chargeAt: {
        type: Date
    },
    endAt: {
        type: Date
    },
    totalCount: {
        type: Number,
        default: 12
    },
    paidCount: {
        type: Number,
        default: 0
    },
    remainingCount: {
        type: Number
    },
    billingPeriod: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
        default: 'monthly'
    },
    notes: {
        pendingActivation: {
            type: Boolean,
            default: true
        },
        isScheduled: {
            type: Boolean,
            default: false
        },
        isRenewal: {
            type: Boolean,
            default: false
        },
        isFreeTrialEnabled: {
            type: Boolean,
            default: false
        },
        trialEndDate: {
            type: Date
        },
        scheduledStart: {
            type: Date
        },
        created_at: {
            type: String
        },
        created_by: {
            type: String
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    payments: [{
        razorpayPaymentId: {
            type: String
        },
        amount: {
            type: Number
        },
        status: {
            type: String
        },
        date: {
            type: Date
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

export default mongoose.model('Subscription', SubscriptionSchema); 