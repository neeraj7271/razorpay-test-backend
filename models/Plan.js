import mongoose from 'mongoose';

const PlanSchema = new mongoose.Schema(
    {
        razorpayPlanId: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        period: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: 'INR',
        },
        interval: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'yearly'],
            default: 'monthly',
        },
        intervalCount: {
            type: Number,
            default: 1,
        },
        billingPeriod: {
            type: String,
            enum: ['yearly', 'quarterly', 'monthly'],
            default: 'yearly',
        },
        features: {
            type: [String],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const Plan = mongoose.model('Plan', PlanSchema);

export default Plan; 