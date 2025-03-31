import Razorpay from 'razorpay';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';
import Customer from '../models/Customer.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import User from '../models/User.js';

dotenv.config();
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createCustomer = async (req, res) => {
    try {
        let { name, email, contact } = req.body;
        let userId = null;

        // If user is authenticated, use their information
        if (req.user) {
            const user = await User.findById(req.user.id);
            if (user) {
                name = name || user.name;
                email = email || user.email;
                contact = contact || user.phone;
                userId = user._id;
            }
        }

        // Validate required fields
        if (!name || !email || !contact) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and contact are required'
            });
        }

        // Check if customer already exists for this user
        let existingCustomer = null;
        if (userId) {
            existingCustomer = await Customer.findOne({ userId });
        }

        if (existingCustomer) {
            return res.status(200).json({
                success: true,
                message: 'Customer already exists for this user',
                customer: existingCustomer,
                isExisting: true
            });
        }

        // Create customer in Razorpay
        const razorpayCustomer = await razorpay.customers.create({
            name,
            email,
            contact,
        });

        // Save customer in MongoDB
        const customer = new Customer({
            razorpayCustomerId: razorpayCustomer.id,
            name,
            email,
            contact,
            userId
        });

        await customer.save();

        // Return comprehensive response
        res.status(200).json({
            success: true,
            message: 'Customer created successfully',
            customer: {
                id: customer._id,
                razorpayCustomerId: customer.razorpayCustomerId,
                name: customer.name,
                email: customer.email,
                contact: customer.contact,
                userId: customer.userId,
                createdAt: customer.createdAt
            },
            isExisting: false
        });
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create customer',
            error: error.message
        });
    }
};

export const createOrder = async (req, res) => {
    const { amount, currency = 'INR', receipt } = req.body;
    let { customerId } = req.body;

    try {
        // If customerId is not provided but user is authenticated, find or create customer
        if (!customerId && req.user) {
            const user = await User.findById(req.user.id);
            if (user) {
                // Try to find an existing customer for this user
                let customer = await Customer.findOne({ userId: user._id });

                if (!customer) {
                    // Create a new customer for this user
                    const razorpayCustomer = await razorpay.customers.create({
                        name: user.name,
                        email: user.email,
                        contact: user.phone || "Not provided"
                    });

                    customer = new Customer({
                        razorpayCustomerId: razorpayCustomer.id,
                        name: user.name,
                        email: user.email,
                        contact: user.phone || "Not provided",
                        userId: user._id
                    });

                    await customer.save();
                }

                customerId = customer.razorpayCustomerId;
            }
        }

        const options = {
            amount: amount * 100,
            currency,
            receipt,
        };

        // Add customer info if available
        if (customerId) {
            options.notes = {
                customerId: customerId
            };
        }

        // Create order in Razorpay
        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const capturePayment = async (req, res) => {
    const { paymentId, orderId, amount, currency, customerId } = req.body;

    try {
        // Capture the payment in Razorpay
        const payment = await razorpay.payments.capture(paymentId, amount, currency);

        // Find the customer in MongoDB
        let customer = null;
        if (customerId) {
            customer = await Customer.findOne({ razorpayCustomerId: customerId });
        }

        // Save payment in MongoDB
        const newPayment = new Payment({
            razorpayPaymentId: paymentId,
            razorpayOrderId: orderId,
            customerId: customer ? customer._id : null,
            amount: amount,
            currency: currency,
            status: 'captured',
            method: payment.method,
            paymentDetails: payment,
        });

        await newPayment.save();

        res.json({
            success: true,
            payment: payment,
            message: 'Payment captured successfully'
        });
    } catch (error) {
        console.error('Error capturing payment:', error);

        if (error.error) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.error
            });
        }

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

        // Update payment status in MongoDB
        await Payment.findOneAndUpdate(
            { razorpayPaymentId: paymentId },
            {
                status: payment.status,
                paymentDetails: payment
            },
            { new: true }
        );

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

        // Process and save plans in MongoDB
        const razorpayPlans = response.data.items;

        for (const plan of razorpayPlans) {
            // Check if plan already exists
            const existingPlan = await Plan.findOne({ razorpayPlanId: plan.id });

            if (!existingPlan) {
                const features = predefinedPlans.find(p => p.planId === plan.id)?.features || [];

                // Create new plan in MongoDB
                const newPlan = new Plan({
                    razorpayPlanId: plan.id,
                    name: plan.item.name,
                    description: plan.item.description,
                    amount: plan.item.amount / 100,
                    currency: plan.item.currency,
                    interval: plan.item.interval,
                    intervalCount: plan.item.interval_count,
                    features: features,
                });

                await newPlan.save();
            }
        }

        // Fetch all plans from MongoDB
        const plans = await Plan.find({ isActive: true });

        // Return plans to frontend
        res.json({
            success: true,
            plans: plans.map(plan => ({
                name: plan.name,
                planId: plan.razorpayPlanId,
                price: `₹${plan.amount}`,
                features: plan.features,
                description: plan.description,
                currency: plan.currency,
                interval: plan.interval,
                interval_count: plan.intervalCount
            }))
        });
    } catch (error) {
        console.error('Error fetching plans:', error);

        if (error.response && error.response.data) {
            return res.status(error.response.status).json({
                success: false,
                error: error.response.data
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to fetch plans',
            message: error.message
        });
    }
};

export const createSubscription = async (req, res) => {
    let { planId, customerId, totalCount = 12 } = req.body;

    try {
        // If user is authenticated but customerId is not provided, try to find or create customer
        if (!customerId && req.user) {
            const user = await User.findById(req.user.id);
            if (user) {
                // Try to find existing customer
                let userCustomer = await Customer.findOne({ userId: user._id });

                if (userCustomer) {
                    customerId = userCustomer.razorpayCustomerId;
                } else {
                    // Create new customer
                    const razorpayCustomer = await razorpay.customers.create({
                        name: user.name,
                        email: user.email,
                        contact: user.phone || "Not provided"
                    });

                    userCustomer = new Customer({
                        razorpayCustomerId: razorpayCustomer.id,
                        name: user.name,
                        email: user.email,
                        contact: user.phone || "Not provided",
                        userId: user._id
                    });

                    await userCustomer.save();
                    customerId = userCustomer.razorpayCustomerId;
                }
            }
        }

        if (!customerId) {
            return res.status(400).json({
                success: false,
                error: 'Customer ID is required'
            });
        }

        if (!planId) {
            return res.status(400).json({
                success: false,
                error: 'Plan ID is required'
            });
        }

        // Find customer in MongoDB
        let customer = await Customer.findOne({ razorpayCustomerId: customerId });

        if (!customer) {
            // If customerId exists but not in our DB, try to find from Razorpay and create in DB
            try {
                const razorpayCustomer = await razorpay.customers.fetch(customerId);

                customer = new Customer({
                    razorpayCustomerId: customerId,
                    name: razorpayCustomer.name,
                    email: razorpayCustomer.email,
                    contact: razorpayCustomer.contact,
                    userId: req.user ? req.user.id : null
                });

                await customer.save();
            } catch (error) {
                console.error('Error fetching customer from Razorpay:', error);
                return res.status(404).json({
                    success: false,
                    error: 'Customer not found',
                    message: error.message
                });
            }
        }

        // Fetch plan details
        let plan = await Plan.findOne({ razorpayPlanId: planId });

        if (!plan) {
            // Fetch plan details from Razorpay
            try {
                const razorpayPlan = await razorpay.plans.fetch(planId);

                plan = new Plan({
                    razorpayPlanId: planId,
                    name: razorpayPlan.item.name,
                    description: razorpayPlan.item.description,
                    amount: razorpayPlan.item.amount / 100,
                    currency: razorpayPlan.item.currency,
                    interval: razorpayPlan.period,
                    intervalCount: razorpayPlan.interval,
                });

                await plan.save();
            } catch (error) {
                console.error('Error fetching plan from Razorpay:', error);
                return res.status(404).json({
                    success: false,
                    error: 'Plan not found',
                    message: error.message
                });
            }
        }

        // Create a subscription
        let subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            total_count: totalCount,
            customer_id: customerId,
            quantity: 1,
            customer_notify: 1,
            notes: {
                created_at: new Date().toISOString(),
                created_by: customerId,
                userId: req.user ? req.user.id : null
            }
        });

        // Create a placeholder subscription entry with status 'created'
        // For localhost testing where webhooks aren't available
        let newSubscription = null;
        if (customer && plan) {
            // First check if this subscription already exists
            const existingSubscription = await Subscription.findOne({
                razorpaySubscriptionId: subscription.id
            });

            if (!existingSubscription) {
                newSubscription = new Subscription({
                    razorpaySubscriptionId: subscription.id,
                    customerId: customer._id,
                    planId: plan._id,
                    status: subscription.status, // Will be 'created' initially
                    currentPeriodStart: new Date(subscription.current_start * 1000),
                    currentPeriodEnd: new Date(subscription.current_end * 1000),
                    totalCount: subscription.total_count,
                    paidCount: subscription.paid_count,
                    notes: {
                        ...subscription.notes,
                        pendingActivation: true // Flag to indicate this needs activation
                    }
                });

                await newSubscription.save();
                console.log(`Subscription created with ID ${subscription.id} and status ${subscription.status}`);
            } else {
                newSubscription = existingSubscription;
                console.log(`Subscription ${subscription.id} already exists with status ${existingSubscription.status}`);
            }
        }

        // For local testing without webhooks, poll for subscription status
        if (process.env.NODE_ENV === 'development') {
            // Start a background process to check subscription status after a delay
            setTimeout(async () => {
                try {
                    // Poll Razorpay for the current status
                    const updatedSubscription = await razorpay.subscriptions.fetch(subscription.id);

                    // If status has changed, update our record
                    if (updatedSubscription.status !== subscription.status) {
                        console.log(`Subscription ${subscription.id} status changed from ${subscription.status} to ${updatedSubscription.status}`);

                        if (newSubscription) {
                            newSubscription.status = updatedSubscription.status;
                            newSubscription.notes = {
                                ...newSubscription.notes,
                                statusUpdated: new Date().toISOString(),
                                updatedStatus: updatedSubscription.status
                            };
                            await newSubscription.save();
                        }
                    }
                } catch (error) {
                    console.error(`Error polling subscription ${subscription.id}:`, error);
                }
            }, 5000); // Check after 5 seconds
        }

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
                short_url: subscription.short_url
            },
            customer: customer ? {
                id: customer._id,
                razorpayCustomerId: customer.razorpayCustomerId,
                name: customer.name,
                email: customer.email
            } : null,
            plan: plan ? {
                id: plan._id,
                razorpayPlanId: plan.razorpayPlanId,
                name: plan.name,
                amount: plan.amount,
                currency: plan.currency,
                interval: plan.interval
            } : null,
            dbSubscription: newSubscription,
            message: "Subscription created. Status will be updated when payment is completed."
        });

    } catch (error) {
        console.error('Error creating subscription:', error);

        if (error.error) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.error
            });
        }

        res.status(500).json({
            success: false,
            error: 'Subscription creation failed',
            message: error.message
        });
    }
};

export const addAddonToSubscription = async (req, res) => {
    const { subscriptionId, addons } = req.body;

    try {
        // Find subscription in MongoDB
        const subscription = await Subscription.findOne({ razorpaySubscriptionId: subscriptionId });

        if (!subscription) {
            // Try to fetch subscription from Razorpay
            try {
                const razorpaySubscription = await razorpay.subscriptions.fetch(subscriptionId);

                // Find customer and plan
                const customer = await Customer.findOne({ razorpayCustomerId: razorpaySubscription.customer_id });
                const plan = await Plan.findOne({ razorpayPlanId: razorpaySubscription.plan_id });

                if (customer && plan) {
                    const newSubscription = new Subscription({
                        razorpaySubscriptionId: subscriptionId,
                        customerId: customer._id,
                        planId: plan._id,
                        status: razorpaySubscription.status,
                        currentPeriodStart: new Date(razorpaySubscription.current_start * 1000),
                        currentPeriodEnd: new Date(razorpaySubscription.current_end * 1000),
                        totalCount: razorpaySubscription.total_count,
                        paidCount: razorpaySubscription.paid_count,
                    });

                    await newSubscription.save();
                }
            } catch (error) {
                console.error('Error fetching subscription from Razorpay:', error);
            }
        }

        // Create addons in Razorpay
        const addonPromises = addons.map(addon => {
            return razorpay.addons.create({
                subscription_id: subscriptionId,
                items: [
                    {
                        name: addon.description,
                        amount: addon.amount * 100,
                        currency: "INR",
                        quantity: addon.quantity || 1
                    }
                ]
            });
        });

        const addonResponses = await Promise.all(addonPromises);

        // Update subscription in MongoDB with addons
        if (subscription) {
            for (const addon of addonResponses) {
                subscription.addons.push({
                    razorpayAddonId: addon.id,
                    name: addon.item.name,
                    amount: addon.item.amount / 100,
                    quantity: addon.item.quantity
                });
            }

            await subscription.save();
        }

        res.json({
            success: true,
            addons: addonResponses
        });
    } catch (error) {
        console.error("Error adding addons:", error);

        if (error.error) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.error
            });
        }

        res.status(500).json({
            success: false,
            error: 'Addon addition failed',
            message: error.message
        });
    }
};

// export const config = {
//     api: {
//         bodyParser: false, // Disable automatic JSON parsing in Vercel
//     },
// };

// export const handleWebhook = async (req, res) => {
//     const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
//     const signature = req.headers['x-razorpay-signature'];
//     const rawBody = req.rawBody;

//     // Verify the webhook signature
//     const hmac = crypto.createHmac('sha256', webhookSecret);
//     hmac.update(rawBody);
//     const calculatedSignature = hmac.digest('hex');

//     if (signature !== calculatedSignature) {
//         console.error('Invalid webhook signature');
//         return res.status(400).json({ message: 'Invalid signature' });
//     }

//     // Process the webhook event
//     try {
//         const event = req.body;
//         processWebhookEvent(event, req.body);
//         res.status(200).json({ message: 'Webhook processed successfully' });
//     } catch (error) {
//         console.error('Error processing webhook:', error);
//         res.status(500).json({ message: 'Error processing webhook' });
//     }
// };

// Process webhook events
export const handleWebhook = async (req, res) => {
    // if (req.method !== 'POST') {
    //     return res.status(405).json({ message: 'Method Not Allowed' });
    // }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Capture raw body manually
    let rawBody = '';
    try {
        rawBody = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', (chunk) => {
                data += chunk;
            });
            req.on('end', () => resolve(data));
            req.on('error', (err) => reject(err));
        });

        // Verify the signature
        const hmac = crypto.createHmac('sha256', webhookSecret);
        hmac.update(rawBody, 'utf8');
        const calculatedSignature = hmac.digest('hex');

        if (signature !== calculatedSignature) {
            console.error('Invalid webhook signature');
            return res.status(400).json({ message: 'Invalid signature' });
        }

        // Process webhook event
        const event = JSON.parse(rawBody);
        console.log('Webhook event received:', event);

        // Call your function to handle the event
        processWebhookEvent(event);

        res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ message: 'Error processing webhook' });
    }
};



const processWebhookEvent = async (event, data) => {
    switch (event) {
        case 'payment.captured':
            await updatePaymentStatus(data.payload.payment.entity.id, 'captured', data.payload.payment.entity);
            break;
        case 'payment.failed':
            await updatePaymentStatus(data.payload.payment.entity.id, 'failed', data.payload.payment.entity);
            break;
        case 'payment.authorized':
            await updatePaymentStatus(data.payload.payment.entity.id, 'authorized', data.payload.payment.entity);
            break;
        case 'payment.refunded':
            await updatePaymentStatus(data.payload.payment.entity.id, 'refunded', data.payload.payment.entity);
            break;
        case 'subscription.activated':
            await updateSubscriptionStatus(data.payload.subscription.entity.id, 'active', data.payload.subscription.entity);
            break;
        case 'subscription.charged':
            await updateSubscriptionCharged(data.payload.subscription.entity.id, data.payload.subscription.entity);
            break;
        case 'subscription.authenticated':
            await updateSubscriptionStatus(data.payload.subscription.entity.id, 'authenticated', data.payload.subscription.entity);
            break;
        case 'subscription.deactivated':
            await updateSubscriptionStatus(data.payload.subscription.entity.id, 'halted', data.payload.subscription.entity);
            break;
        case 'subscription.ended':
            await updateSubscriptionStatus(data.payload.subscription.entity.id, 'completed', data.payload.subscription.entity);
            break;
        case 'order.paid':
            await updateOrderPaid(data.payload.order.entity.id, data.payload.order.entity);
            break;
        case 'invoice.paid':
            await updateInvoiceStatus(data.payload.invoice.entity.id, 'paid', data.payload.invoice.entity);
            break;
        case 'invoice.failed':
            await updateInvoiceStatus(data.payload.invoice.entity.id, 'failed', data.payload.invoice.entity);
            break;
        default:
            console.log('Unhandled event:', event);
    }
};

// Helper functions for updating database based on webhook events
const updatePaymentStatus = async (paymentId, status, paymentData) => {
    try {
        const payment = await Payment.findOne({ razorpayPaymentId: paymentId });

        if (payment) {
            payment.status = status;
            payment.paymentDetails = paymentData;
            await payment.save();
        } else {
            // Payment not found in DB, create a new record
            try {
                // Find customer if exists
                let customerId = null;
                if (paymentData.customer_id) {
                    const customer = await Customer.findOne({ razorpayCustomerId: paymentData.customer_id });
                    if (customer) {
                        customerId = customer._id;
                    }
                }

                const newPayment = new Payment({
                    razorpayPaymentId: paymentId,
                    razorpayOrderId: paymentData.order_id,
                    customerId: customerId,
                    amount: paymentData.amount / 100,
                    currency: paymentData.currency,
                    status: status,
                    method: paymentData.method,
                    paymentDetails: paymentData,
                });

                await newPayment.save();
            } catch (error) {
                console.error(`Error creating payment for ${paymentId}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error updating payment status for ${paymentId}:`, error);
    }
};

const updateSubscriptionStatus = async (subscriptionId, status, subscriptionData) => {
    try {
        console.log(`Updating subscription ${subscriptionId} status to ${status}`);
        const subscription = await Subscription.findOne({ razorpaySubscriptionId: subscriptionId });

        if (subscription) {
            // Log previous status
            console.log(`Found subscription ${subscriptionId} with current status ${subscription.status}`);

            // Update subscription data
            subscription.status = status;
            subscription.currentPeriodStart = new Date(subscriptionData.current_start * 1000);
            subscription.currentPeriodEnd = new Date(subscriptionData.current_end * 1000);
            subscription.paidCount = subscriptionData.paid_count;

            // Add notes about the update
            subscription.notes = {
                ...subscription.notes,
                statusUpdated: new Date().toISOString(),
                previousStatus: subscription.status,
                newStatus: status,
                updateMethod: 'webhook'
            };

            // If being activated, remove the pendingActivation flag
            if (status === 'active' || status === 'authenticated') {
                subscription.notes.pendingActivation = false;
                subscription.notes.activatedAt = new Date().toISOString();
            }

            await subscription.save();
            console.log(`Successfully updated subscription ${subscriptionId} to ${status}`);
        } else {
            console.log(`Subscription ${subscriptionId} not found, creating new record with status ${status}`);

            // Subscription not found in DB, try to create one
            try {
                // Get plan and customer
                const plan = await Plan.findOne({ razorpayPlanId: subscriptionData.plan_id });
                const customer = await Customer.findOne({ razorpayCustomerId: subscriptionData.customer_id });

                if (plan && customer) {
                    console.log(`Found matching plan and customer for subscription ${subscriptionId}`);

                    // Create a new subscription record
                    const newSubscription = new Subscription({
                        razorpaySubscriptionId: subscriptionId,
                        customerId: customer._id,
                        planId: plan._id,
                        status: status,
                        currentPeriodStart: new Date(subscriptionData.current_start * 1000),
                        currentPeriodEnd: new Date(subscriptionData.current_end * 1000),
                        totalCount: subscriptionData.total_count,
                        paidCount: subscriptionData.paid_count,
                        notes: {
                            createdByWebhook: true,
                            createdAt: new Date().toISOString(),
                            initialStatus: status
                        }
                    });

                    // If already active, mark as activated
                    if (status === 'active' || status === 'authenticated') {
                        newSubscription.notes.pendingActivation = false;
                        newSubscription.notes.activatedAt = new Date().toISOString();
                    } else {
                        newSubscription.notes.pendingActivation = true;
                    }

                    await newSubscription.save();
                    console.log(`Successfully created subscription ${subscriptionId} with status ${status}`);

                    // If the subscription belongs to a user, try to find and update the user record
                    if (customer.userId) {
                        try {
                            const user = await User.findById(customer.userId);
                            if (user) {
                                console.log(`Updating user ${user._id} with subscription info`);
                                // You can add code here to update user record if needed
                            }
                        } catch (error) {
                            console.error(`Error updating user for subscription ${subscriptionId}:`, error);
                        }
                    }
                } else {
                    console.log(`Could not find matching plan or customer for subscription ${subscriptionId}`);
                }
            } catch (error) {
                console.error(`Error creating subscription for ${subscriptionId}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error updating subscription status for ${subscriptionId}:`, error);
    }
};

const updateSubscriptionCharged = async (subscriptionId, subscriptionData) => {
    try {
        await updateSubscriptionStatus(subscriptionId, 'active', subscriptionData);
        console.log(`Subscription ${subscriptionId} charged and updated`);
    } catch (error) {
        console.error(`Error updating subscription charge for ${subscriptionId}:`, error);
    }
};

const updateOrderPaid = async (orderId, orderData) => {
    try {
        // We don't have an Order model, but we can update related payment if exists
        const payment = await Payment.findOne({ razorpayOrderId: orderId });
        if (payment) {
            payment.status = 'captured';
            payment.paymentDetails = { ...payment.paymentDetails, order: orderData };
            await payment.save();
        }
    } catch (error) {
        console.error(`Error updating order paid for ${orderId}:`, error);
    }
};

const updateInvoiceStatus = async (invoiceId, status, invoiceData) => {
    // You may create an Invoice model if needed
    console.log(`Invoice ${invoiceId} status updated to ${status}`);
};

// @desc    Validate if a discount was applied to a subscription
// @route   GET /api/validate-discount/:subscriptionId
// @access  Private
export const validateDiscount = async (req, res) => {
    try {
        const { subscriptionId } = req.params;

        // Find the subscription
        const subscription = await Subscription.findOne({
            razorpaySubscriptionId: subscriptionId
        });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        // Check if the subscription belongs to the current user's customer
        const customer = await Customer.findOne({ userId: req.user.id });

        if (!customer || !subscription.customerId.equals(customer._id)) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to access this subscription'
            });
        }

        // Check if discount is applied
        if (!subscription.discount) {
            return res.status(200).json({
                success: true,
                hasDiscount: false,
                discount: null
            });
        }

        // Return discount information
        res.status(200).json({
            success: true,
            hasDiscount: true,
            discount: {
                amount: subscription.discount.amount,
                type: subscription.discount.type,
                appliedAt: subscription.discount.appliedAt,
                notes: subscription.discount.notes
            }
        });
    } catch (error) {
        console.error('Error validating discount:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate discount',
            error: error.message
        });
    }
};

// @desc    Get all customers for the logged in user
// @route   GET /api/customers
// @access  Private
export const getCustomers = async (req, res) => {
    try {
        // Find customers associated with the current user
        const customers = await Customer.find({ userId: req.user.id });

        res.status(200).json({
            success: true,
            count: customers.length,
            data: customers
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customers',
            error: error.message
        });
    }
};

// @desc    Get all subscriptions for the logged in user
// @route   GET /api/subscriptions
// @access  Private
export const getUserSubscriptions = async (req, res) => {
    try {
        // Find the customer associated with the current user
        const customer = await Customer.findOne({ userId: req.user.id });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'No customer profile found for the current user'
            });
        }

        // Find subscriptions for this customer
        const subscriptions = await Subscription.find({ customerId: customer._id })
            .populate('planId', 'name amount currency interval features');

        res.status(200).json({
            success: true,
            count: subscriptions.length,
            data: subscriptions
        });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscriptions',
            error: error.message
        });
    }
};

// @desc    Get details of a specific subscription
// @route   GET /api/subscriptions/:subscriptionId
// @access  Private
export const getSubscriptionDetails = async (req, res) => {
    try {
        const { subscriptionId } = req.params;

        // Find the subscription and populate related data
        const subscription = await Subscription.findOne({
            razorpaySubscriptionId: subscriptionId
        })
            .populate('planId', 'name description amount currency interval features')
            .populate('customerId', 'name email contact razorpayCustomerId');

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        // Check if the subscription belongs to the current user
        const customer = await Customer.findOne({ userId: req.user.id });

        if (!customer || !subscription.customerId._id.equals(customer._id)) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to access this subscription'
            });
        }

        // Get related payments for this subscription
        const payments = await Payment.find({
            customerId: subscription.customerId._id
        })
            .sort({ createdAt: -1 });

        // Return comprehensive subscription details
        res.status(200).json({
            success: true,
            data: {
                subscription,
                payments
            }
        });
    } catch (error) {
        console.error('Error fetching subscription details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription details',
            error: error.message
        });
    }
};

// @desc    Get transaction history for the logged in user
// @route   GET /api/transactions
// @access  Private
export const getTransactionHistory = async (req, res) => {
    try {
        // Find the customer associated with the current user
        const customer = await Customer.findOne({ userId: req.user.id });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'No customer profile found for the current user'
            });
        }

        // Find all payments for this customer
        const transactions = await Payment.find({ customerId: customer._id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: transactions.length,
            data: transactions
        });
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction history',
            error: error.message
        });
    }
};

// @desc    Manually check and update subscription status
// @route   POST /api/check-subscription/:subscriptionId
// @access  Private
export const checkSubscriptionStatus = async (req, res) => {
    try {
        const { subscriptionId } = req.params;

        // Find the subscription in our database
        const subscription = await Subscription.findOne({
            razorpaySubscriptionId: subscriptionId
        });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found in database'
            });
        }

        // Check if the subscription belongs to the current user
        const customer = await Customer.findOne({ userId: req.user.id });

        if (!customer || !subscription.customerId.equals(customer._id)) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to access this subscription'
            });
        }

        // Fetch current status from Razorpay
        const razorpaySubscription = await razorpay.subscriptions.fetch(subscriptionId);

        // Update our record if the status has changed
        let statusChanged = false;
        if (razorpaySubscription.status !== subscription.status) {
            statusChanged = true;

            // Update our database record
            subscription.status = razorpaySubscription.status;
            subscription.notes = {
                ...subscription.notes,
                manuallyChecked: true,
                checkedAt: new Date().toISOString(),
                previousStatus: subscription.status,
                updatedStatus: razorpaySubscription.status
            };

            // If activated, update activation flags
            if (razorpaySubscription.status === 'active' || razorpaySubscription.status === 'authenticated') {
                subscription.notes.pendingActivation = false;
                subscription.notes.activatedAt = new Date().toISOString();
            }

            await subscription.save();
        }

        res.status(200).json({
            success: true,
            message: statusChanged
                ? `Subscription status updated from ${subscription.status} to ${razorpaySubscription.status}`
                : `Subscription status is already ${subscription.status}`,
            subscription: {
                id: subscription.razorpaySubscriptionId,
                status: subscription.status,
                currentPeriodStart: subscription.currentPeriodStart,
                currentPeriodEnd: subscription.currentPeriodEnd,
                totalCount: subscription.totalCount,
                paidCount: subscription.paidCount
            },
            razorpayStatus: razorpaySubscription.status
        });
    } catch (error) {
        console.error('Error checking subscription status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check subscription status',
            error: error.message
        });
    }
};