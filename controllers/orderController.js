import Razorpay from 'razorpay';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Controller function to create an order
export const createOrder = async (req, res) => {
    const options = {
        amount: req.body.amount, // Amount in smallest currency unit
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