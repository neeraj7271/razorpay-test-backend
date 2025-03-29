import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
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
        description: {
            type: String,
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
            default: 'yearly',
        },
        intervalCount: {
            type: Number,
            default: 1,
        },
        features: [String],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const Plan = mongoose.model('Plan', planSchema);

export default Plan; 