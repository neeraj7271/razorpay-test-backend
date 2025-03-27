import Razorpay from 'razorpay';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Controller function to create an order
export const createOrder = async (req, res) => {
    const options = {
        amount: (req.body.amount) * 100, // Amount in smallest currency unit
        currency: req.body.currency || 'INR', // Default to INR if not provided
        receipt: req.body.receipt,
    };

    try {
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error('Error creating order:', error); // Log the error
        res.status(500).json({ error: error.message });
    }
};

export const capturePayment = async (req, res) => {
    const { paymentId, orderId, amount, currency } = req.body;

    try {
        // Verify the payment signature first (optional but recommended)

        // Capture the payment
        const payment = await razorpay.payments.capture(paymentId, amount, currency);

        // Log the successful payment
        console.log('Payment captured successfully:', payment);

        // Send success response
        res.json({
            success: true,
            payment: payment,
            message: 'Payment captured successfully'
        });

    } catch (error) {
        console.error('Error capturing payment:', error);

        // Check if it's a Razorpay error
        if (error.error) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.error
            });
        }

        // Generic error response
        res.status(500).json({
            success: false,
            error: 'Payment capture failed',
            message: error.message
        });
    }
};

export const verifyPayment = async (req, res) => {
    const { paymentId, orderId } = req.body;

    try {
        const payment = await razorpay.payments.fetch(paymentId);

        if (payment.status === "captured") {
            return res.json({ success: true, message: "Payment verified!" });
        } else {
            return res.json({ success: false, message: "Payment not captured!" });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error verifying payment" });
    }
};

export const getPlans = async (req, res) => {
    try {
        // Predefined plans data
        const predefinedPlans = [
            {
                name: 'Basic',
                planId: 'plan_QBlYx1h4pfIO9r',
                price: '₹1',
                features: [
                    'Limited Access',
                    '1 User',
                    'Basic Support',
                    '5GB Storage'
                ]
            },
            {
                name: 'Pro',
                planId: 'plan_QBlZZmYEihtNxF',
                price: '₹2',
                features: [
                    'Full Access',
                    '5 Users',
                    'Priority Support',
                    '50GB Storage',
                    'Advanced Analytics'
                ]
            },
            {
                name: 'Enterprise',
                planId: 'plan_QBlZwNbWXDZqpn',
                price: '₹3',
                features: [
                    'Unlimited Access',
                    'Unlimited Users',
                    '24/7 Dedicated Support',
                    '1TB Storage',
                    'Custom Integrations',
                    'Advanced Security'
                ]
            }
        ];

        // Fetch plans from Razorpay API
        const response = await axios.get('https://api.razorpay.com/v1/plans', {
            auth: {
                username: process.env.RAZORPAY_KEY_ID,
                password: process.env.RAZORPAY_KEY_SECRET
            }
        });

        // Transform the Razorpay plans data
        const razorpayPlans = response.data.items.map(plan => ({
            name: plan.item.name,
            planId: plan.id,
            price: `₹${plan.item.amount / 100}`, // Convert amount from paise to rupees
            features: plan.item.notes ? Object.values(plan.item.notes) : [],
            description: plan.item.description,
            currency: plan.item.currency,
            interval: plan.item.interval,
            interval_count: plan.item.interval_count
        }));

        // Combine both predefined and Razorpay plans
        const allPlans = [...predefinedPlans, ...razorpayPlans];

        // Send the combined plans to the frontend
        res.json({
            success: true,
            plans: allPlans
        });

    } catch (error) {
        console.error('Error fetching plans:', error);

        // Check if it's a Razorpay error
        if (error.response && error.response.data) {
            return res.status(error.response.status).json({
                success: false,
                error: error.response.data
            });
        }

        // Generic error response
        res.status(500).json({
            success: false,
            error: 'Failed to fetch plans',
            message: error.message
        });
    }
};


