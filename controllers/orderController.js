import Razorpay from 'razorpay';

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

