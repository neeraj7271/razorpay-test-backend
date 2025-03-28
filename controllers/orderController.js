import Razorpay from 'razorpay';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createCustomer = async (req, res) => {
    const { name, email, contact } = req.body; // Get customer details from request body

    try {
        const customer = await razorpay.customers.create({
            name,
            email,
            contact,
        });
        res.status(200).json(customer); // Return the customer object, which includes the customer ID
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ message: 'Failed to create customer', error: error.message });
    }
};

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
            features: predefinedPlans.find(p => p.planId === plan.id)?.features || [],
            description: plan.item.description,
            currency: plan.item.currency,
            interval: plan.item.interval,
            interval_count: plan.item.interval_count
        }));

        // Combine both predefined and Razorpay plans
        const allPlans = razorpayPlans;

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

// export const createSubscription = async (req, res) => {
//     const { planId, customerId, totalCount = 12 } = req.body;

//     try {
//         // Create a subscription
//         const subscription = await razorpay.subscriptions.create({
//             plan_id: planId,
//             total_count: totalCount,
//             customer_id: customerId,
//             quantity: 1,
//             customer_notify: 1, // Notify the customer about the subscription
//             notes: {
//                 // Add any notes you want to associate with the subscription
//                 created_at: new Date().toISOString(),
//                 created_by: customerId
//             }
//         });

//         // Send the subscription details to frontend
//         res.json({
//             success: true,
//             subscription: {
//                 id: subscription.id,
//                 status: subscription.status,
//                 current_start: subscription.current_start,
//                 current_end: subscription.current_end,
//                 plan_id: subscription.plan_id,
//                 total_count: subscription.total_count,
//                 paid_count: subscription.paid_count,
//                 customer_notify: subscription.customer_notify,
//                 short_url: subscription.short_url // Payment link that can be shared with customer
//             }
//         });

//     } catch (error) {
//         console.error('Error creating subscription:', error);

//         // Check if it's a Razorpay error
//         if (error.error) {
//             return res.status(error.statusCode).json({
//                 success: false,
//                 error: error.error
//             });
//         }

//         // Generic error response
//         res.status(500).json({
//             success: false,
//             error: 'Subscription creation failed',
//             message: error.message
//         });
//     }
// };


export const createSubscription = async (req, res) => {
    let { planId, customerId, customerDetails, totalCount = 12 } = req.body;

    try {


        // Create a subscription
        let subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            total_count: totalCount,
            customer_id: customerId,
            quantity: 1,
            customer_notify: 1, // Notify the customer about the subscription
            notes: {
                created_at: new Date().toISOString(),
                created_by: customerId
            }
        });

        // Send the subscription details to frontend
        res.json({
            success: true,
            subscription: {
                id: subscription.id,
                status: subscription.status,
                current_start: subscription.current_start,
                current_end: subscription.current_end,
                plan_id: subscription.plan_id,
                total_count: subscription.total_count,
                paid_count: subscription.paid_count,
                customer_notify: subscription.customer_notify,
                short_url: subscription.short_url // Payment link that can be shared with customer
            }
        });

    } catch (error) {
        console.error('Error creating subscription:', error);

        // Check if it's a Razorpay error
        if (error.error) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.error
            });
        }
    }
};

export const addAddonToSubscription = async (req, res) => {
    const { subscriptionId, addons } = req.body; // Expecting an array of addons

    try {
        // Create the addons using the Razorpay instance
        const addonPromises = addons.map(addon => {
            return razorpay.addons.create({
                subscription_id: subscriptionId,
                items: [
                    {
                        name: addon.description,
                        amount: addon.amount * 100, // Convert to paise
                        currency: "INR",
                        quantity: addon.quantity || 1 // Default to 1 if not provided
                    }
                ]
            });
        });

        // Wait for all addon creation promises to resolve
        const addonResponses = await Promise.all(addonPromises);

        console.log("Addons Added:", addonResponses);
        res.json({
            success: true,
            addons: addonResponses
        });
    } catch (error) {
        console.error("Error adding addons:", error);

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
            error: 'Addon addition failed',
            message: error.message
        });
    }
};


export const handleWebhook = (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET; // Replace with your actual webhook secret
    const signature = req.headers['x-razorpay-signature'];

    // Verify the webhook signature
    const expectedSignature = crypto.createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (signature !== expectedSignature) {
        return res.status(400).send('Invalid signature');
    }

    // Handle the webhook event
    const event = req.body.event;

    switch (event) {
        case 'payment.captured':
            // Handle payment captured event
            console.log('Payment captured:', req.body);
            // You can update your database or notify the user here
            break;
        case 'subscription.activated':
            // Handle subscription activated event
            console.log('Subscription activated:', req.body);
            // You can update your database or notify the user here
            break;
        // Add more cases for other events you want to handle
        default:
            console.log('Unhandled event:', event);
    }

    // Respond to Razorpay
    res.status(200).send('Webhook received');
};