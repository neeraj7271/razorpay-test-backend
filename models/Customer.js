import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
    {
        razorpayCustomerId: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        contact: {
            type: String,
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        notes: {
            type: Object,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

const Customer = mongoose.model('Customer', customerSchema);

export default Customer; 