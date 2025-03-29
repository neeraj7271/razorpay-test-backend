import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
    {
        razorpayPaymentId: {
            type: String,
            required: true,
            unique: true,
        },
        razorpayOrderId: {
            type: String,
            required: true,
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            required: true,
            default: 'INR',
        },
        status: {
            type: String,
            enum: ['created', 'authorized', 'captured', 'refunded', 'failed'],
            default: 'created',
        },
        method: {
            type: String,
        },
        paymentDetails: {
            type: Object,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment; 