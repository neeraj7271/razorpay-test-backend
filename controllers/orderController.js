import Razorpay from 'razorpay';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';
import Customer from '../models/Customer.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createCustomer = async (req, res) => {
    console.log("createCustomer", req.body);
    try {
        await connectDB();
        let { name, email, contact } = req.body;
        console.log("name, email, contact", name, email, contact);
        let userId = null;

        // If user is authenticated, use their information
        // if (req.user) {
        //     const user = await User.findById(req.user.id);
        //     if (user) {
        //         name = name || user.name;
        //         email = email || user.email;
        //         contact = contact || user.phone;
        //         // userId = user._id;
        //     }
        // }

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
                customer: existingCustomer
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
            }
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
        // Define separate IDs for yearly and quarterly plans to avoid database conflicts
        const predefinedPlans = [
            // Yearly plans
            {
                name: 'Basic',
                planId: 'plan_QE3hhTUMBT4aCK',
                type: 'yearly',
                features: [
                    'Up to 5 users',
                    'Up to 5 companies',
                    'Single user Tally on Cloud',
                    'Email support'
                ],
                price: 6000
            },
            {
                name: 'Advance',
                planId: 'plan_QE3igMBvi33VIp',
                type: 'yearly',
                features: [
                    'Up to 15 users',
                    'Up to 15 companies',
                    'Single user Tally on Cloud',
                    'Call support'
                ],
                price: 12000
            },
            {
                name: 'Professional',
                planId: 'plan_QE3jTkUD8zyDww',
                type: 'yearly',
                features: [
                    'Unlimited users',
                    'Unlimited companies',
                    'Mandatory Tally License',
                    'Executive support'
                ],
                price: 25000
            },
            // Quarterly plans - each with unique IDs or use the yearly ones with different params
            {
                name: 'Basic',
                planId: 'plan_QE3hhTUMBT4aCK',
                type: 'quarterly',
                features: [
                    'Up to 5 users',
                    'Up to 5 companies',
                    'Single user Tally on Cloud',
                    'Email support'
                ],
                price: 1500
            },
            {
                name: 'Advance',
                planId: 'plan_QE3igMBvi33VIp',
                type: 'quarterly',
                features: [
                    'Up to 15 users',
                    'Up to 15 companies',
                    'Single user Tally on Cloud',
                    'Call support'
                ],
                price: 6250
            },
            {
                name: 'Professional',
                planId: 'plan_QE3jTkUD8zyDww',
                type: 'quarterly',
                features: [
                    'Unlimited users',
                    'Unlimited companies',
                    'Mandatory Tally License',
                    'Executive support'
                ],
                price: 3000
            }
        ];

        try {
            // Fetch plans from Razorpay API
            const response = await axios.get('https://api.razorpay.com/v1/plans', {
                auth: {
                    username: process.env.RAZORPAY_KEY_ID,
                    password: process.env.RAZORPAY_KEY_SECRET
                }
            });

            const razorpayPlans = response.data.items;

            // Create plan lookup maps
            const planInfo = {};

            // Process Razorpay plans and get their details
            for (const plan of razorpayPlans) {
                planInfo[plan.id] = {
                    id: plan.id,
                    name: plan.item.name,
                    description: plan.item.description || '',
                    price: plan.item.amount / 100,
                    currency: plan.item.currency,
                    interval: plan.period,
                    intervalCount: plan.interval
                };
            }
        } catch (error) {
            console.error('Could not fetch plans from Razorpay:', error);
            // Continue with predefined plans even if Razorpay fetch fails
        }

        // Prepare plans data based only on predefined plans
        const yearlyPlans = [];
        const quarterlyPlans = [];

        // Process plans without saving to database
        for (const plan of predefinedPlans) {
            const formattedPlan = new Plan({
                id: plan.planId,
                planId: plan.planId,
                name: plan.name,
                price: plan.price,
                planType: plan.type === 'yearly' ? 'Annual' : 'Quarterly',
                currency: 'INR',
                description: `${plan.name} Plan (${plan.type === 'yearly' ? 'Annual' : 'Quarterly'})`,
                features: plan.features,
                type: plan.type,
                interval: plan.type === 'yearly' ? 'year' : 'month',
                intervalCount: plan.type === 'yearly' ? 1 : 3
            });

            if (plan.type === 'yearly') {
                yearlyPlans.push(formattedPlan);
            } else if (plan.type === 'quarterly') {
                quarterlyPlans.push(formattedPlan);
            }
            await formattedPlan.save();
        }


        // Sort plans by price
        yearlyPlans.sort((a, b) => a.price - b.price);
        quarterlyPlans.sort((a, b) => a.price - b.price);

        // Group plans by level (Basic, Advance, Professional)
        const groupedPlans = {
            yearly: {
                Basic: yearlyPlans.find(p => p.name === 'Basic'),
                Advance: yearlyPlans.find(p => p.name === 'Advance'),
                Professional: yearlyPlans.find(p => p.name === 'Professional')
            },
            quarterly: {
                Basic: quarterlyPlans.find(p => p.name === 'Basic'),
                Advance: quarterlyPlans.find(p => p.name === 'Advance'),
                Professional: quarterlyPlans.find(p => p.name === 'Professional')
            }
        };

        // Return all plan data as arrays and grouped object
        res.json({
            success: true,
            plans: [...yearlyPlans, ...quarterlyPlans].sort((a, b) => a.price - b.price),
            yearlyPlans: yearlyPlans,
            quarterlyPlans: quarterlyPlans,
            groupedPlans: groupedPlans
        });
    } catch (error) {
        console.error('Error in getPlans:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch plans',
            error: error.message
        });
    }
};

// export const createSubscription = async (req, res) => {
//     console.log("createSubscription", req.body);
//     let { planId, customerId, totalCount = 12, startAt, billingPeriod } = req.body;

//     try {
//         // If user is authenticated but customerId is not provided, try to find or create customer
//         // if (!customerId) {
//         //    // const user = await User.findById(req.user.id);
//         //     if (user) {
//         //         // Try to find existing customer
//         //         let userCustomer = await Customer.findOne({ userId: user._id });

//         //         if (userCustomer) {
//         //             customerId = userCustomer.razorpayCustomerId;
//         //         } else {
//         //             // Create new customer
//         //             const razorpayCustomer = await razorpay.customers.create({
//         //                 name: user.name,
//         //                 email: user.email,
//         //                 contact: user.phone || "Not provided"
//         //             });

//         //             userCustomer = new Customer({
//         //                 razorpayCustomerId: razorpayCustomer.id,
//         //                 name: user.name,
//         //                 email: user.email,
//         //                 contact: user.phone || "Not provided",
//         //                 userId: user._id
//         //             });

//         //             await userCustomer.save();
//         //             customerId = userCustomer.razorpayCustomerId;
//         //         }
//         //     }
//         // }

//         // Validate required fields
//         if (!customerId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Customer ID is required'
//             });
//         }

//         if (!planId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Plan ID is required'
//             });
//         }

//         // Find customer in MongoDB
//         let customer = await Customer.findOne({ razorpayCustomerId: customerId });
//         console.log("printing the customer recieved from the body", customer);

//         if (!customer) {
//             // If customerId exists but not in our DB, try to find from Razorpay and create in DB
//             try {
//                 const razorpayCustomer = await razorpay.customers.fetch(customerId);

//                 customer = new Customer({
//                     razorpayCustomerId: customerId,
//                     name: razorpayCustomer.name,
//                     email: razorpayCustomer.email,
//                     contact: razorpayCustomer.contact,
//                     userId: req.user ? req.user.id : null
//                 });

//                 await customer.save();
//             } catch (error) {
//                 console.error('Error fetching customer from Razorpay:', error);
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Customer not found',
//                     error: error.message
//                 });
//             }
//         }

//         // Fetch plan detailscon
//         console.log("planId fething the plan", planId);
//         let plan = await Plan.findOne({ razorpayPlanId: planId });
//         console.log("plan", plan);

//         if (!plan) {
//             // Fetch plan details from Razorpay
//             try {
//                 const razorpayPlan = await razorpay.plans.fetch(planId);

//                 // Determine billing period from plan or request
//                 const planBillingPeriod = billingPeriod ||
//                     (razorpayPlan.period === 'month' && razorpayPlan.interval === 3 ? 'quarterly' :
//                         razorpayPlan.period === 'year' ? 'yearly' : 'monthly');

//                 plan = new Plan({
//                     razorpayPlanId: planId,
//                     name: razorpayPlan.item.name,
//                     description: razorpayPlan.item.description,
//                     amount: razorpayPlan.item.amount / 100,
//                     currency: razorpayPlan.item.currency,
//                     interval: razorpayPlan.period,
//                     intervalCount: razorpayPlan.interval,
//                     billingPeriod: planBillingPeriod
//                 });

//                 await plan.save();
//             } catch (error) {
//                 console.error('Error fetching plan from Razorpay:', error);
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Plan not found',
//                     error: error.message
//                 });
//             }
//         }

//         // Set totalCount based on billing period if not specified
//         if (!req.body.totalCount) {
//             const planBillingPeriod = billingPeriod || plan.billingPeriod;
//             if (planBillingPeriod === 'yearly') {
//                 totalCount = 1; // One payment for annual
//             } else if (planBillingPeriod === 'quarterly') {
//                 totalCount = 4; // Four quarterly payments
//             } else if (planBillingPeriod === 'monthly') {
//                 totalCount = 12; // Twelve monthly payments
//             }
//         }

//         console.log("startAt", startAt);
//         // Create subscription options
//         //!active subscription will define the start date
//         const subscriptionOptions = {
//             plan_id: planId,
//             total_count: totalCount,
//             customer_id: customerId,
//             start_at: startAt,
//             quantity: 1,
//             customer_notify: 1,
//             notes: {
//                 created_at: new Date().toISOString(),
//                 created_by: customerId,
//                 userId: req.user ? req.user.id : null,
//                 billingPeriod: billingPeriod || plan.billingPeriod
//             }
//         };

//         // Handle start_at parameter for future subscription scheduling
//         // If startAt is provided, convert it to a Unix timestamp if needed
//         if (startAt) {
//             let startAtTimestamp = startAt;

//             // If startAt is a Date object or date string, convert to timestamp in seconds
//             if (typeof startAt === 'string' && !startAt.match(/^\d+$/)) {
//                 startAtTimestamp = Math.floor(new Date(startAt).getTime() / 1000);
//             } else if (startAt instanceof Date) {
//                 startAtTimestamp = Math.floor(startAt.getTime() / 1000);
//             } else if (typeof startAt === 'number' && startAt < 10000000000) {
//                 // If it's already a timestamp in seconds, use as is
//                 startAtTimestamp = startAt;
//             } else if (typeof startAt === 'number') {
//                 // If it's a timestamp in milliseconds, convert to seconds
//                 startAtTimestamp = Math.floor(startAt / 1000);
//             }

//             // Ensure the timestamp is at least 24 hours in the future (Razorpay requirement)
//             const minimumStartAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
//             if (startAtTimestamp < minimumStartAt) {
//                 startAtTimestamp = minimumStartAt;
//             }

//             subscriptionOptions.start_at = startAtTimestamp;
//             subscriptionOptions.notes.scheduledStart = new Date(startAtTimestamp * 1000).toISOString();
//         }

//         // Add expire_by if needed (for auto-cancellation if not authorized)
//         if (startAt) {
//             // Set expiry to 7 days from now or 1 day before start_at, whichever is earlier
//             const sevenDaysFromNow = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
//             const oneDayBeforeStart = subscriptionOptions.start_at - 24 * 60 * 60;
//             subscriptionOptions.expire_by = Math.min(sevenDaysFromNow, oneDayBeforeStart);
//         } else {
//             // For immediate subscriptions, set to expire after 7 days if not authenticated
//             subscriptionOptions.expire_by = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
//         }

//         console.log("Subscription options being sent to Razorpay:", JSON.stringify(subscriptionOptions, null, 2));

//         // Also verify the plan exists in Razorpay before trying to create subscription
//         try {
//             const planCheck = await razorpay.plans.fetch(planId);
//             console.log("Plan exists in Razorpay:", planCheck.id);
//         } catch (error) {
//             console.error("Plan doesn't exist in Razorpay:", error.error.description);
//             return res.status(404).json({
//                 success: false,
//                 message: "The plan ID doesn't exist in Razorpay",
//                 error: error.error
//             });
//         }

//         // Create subscription in Razorpay
//         const subscription = await razorpay.subscriptions.create(subscriptionOptions);
//         console.log("subscription", subscription);

//         // Create subscription in our database
//         const newSubscription = new Subscription({
//             razorpaySubscriptionId: subscription.id,
//             customerId: customer._id,
//             planId: plan._id,
//             status: subscription.status,
//             startAt: subscription.start_at ? new Date(subscription.start_at * 1000) : null,
//             chargeAt: subscription.charge_at ? new Date(subscription.charge_at * 1000) : null,
//             totalCount: subscription.total_count,
//             paidCount: subscription.paid_count,
//             billingPeriod: billingPeriod || plan.billingPeriod,
//             notes: {
//                 ...subscription.notes,
//                 pendingActivation: true,
//                 isScheduled: !!subscription.start_at
//             }
//         });

//         await newSubscription.save();

//         // Return subscription details
//         res.status(200).json({
//             success: true,
//             subscription: {
//                 id: subscription.id,
//                 status: subscription.status,
//                 startAt: subscription.start_at,
//                 chargeAt: subscription.charge_at,
//                 current_start: subscription.current_start,
//                 current_end: subscription.current_end,
//                 plan_id: subscription.plan_id,
//                 total_count: subscription.total_count,
//                 paid_count: subscription.paid_count,
//                 customer_notify: subscription.customer_notify,
//                 short_url: subscription.short_url,
//                 billingPeriod: billingPeriod || plan.billingPeriod
//             },
//             customer: {
//                 id: customer._id,
//                 razorpayCustomerId: customer.razorpayCustomerId,
//                 name: customer.name,
//                 email: customer.email
//             },
//             plan: {
//                 id: plan._id,
//                 razorpayPlanId: plan.razorpayPlanId,
//                 name: plan.name,
//                 amount: plan.amount,
//                 currency: plan.currency,
//                 interval: plan.interval,
//                 billingPeriod: plan.billingPeriod
//             }
//         });

//     } catch (error) {
//         console.error('Error creating subscription:', error);

//         // Handle specific Razorpay errors
//         if (error.error) {
//             return res.status(error.statusCode || 400).json({
//                 success: false,
//                 message: error.error.description || 'Failed to create subscription',
//                 error: error.error
//             });
//         }

//         res.status(500).json({
//             success: false,
//             message: 'Failed to create subscription',
//             error: error.message
//         });
//     }
// };

// export const createSubscription = async (req, res) => {
//     console.log("createSubscription", req.body);
//     let { planId, customerId, totalCount = 12, billingPeriod } = req.body;

//     try {
//         await connectDB();
//         // Validate required fields
//         if (!customerId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Customer ID is required'
//             });
//         }

//         if (!planId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Plan ID is required'
//             });
//         }

//         // Find customer in MongoDB
//         let customer = await Customer.findOne({ razorpayCustomerId: customerId });
//         console.log("printing the customer recieved from the body", customer);

//         if (!customer) {
//             // If customerId exists but not in our DB, try to find from Razorpay and create in DB
//             try {
//                 const razorpayCustomer = await razorpay.customers.fetch(customerId);

//                 customer = await new Customer({
//                     razorpayCustomerId: customerId,
//                     name: razorpayCustomer.name,
//                     email: razorpayCustomer.email,
//                     contact: razorpayCustomer.contact,
//                     userId: req.user ? req.user.id : null
//                 });

//                 await customer.save();
//             } catch (error) {
//                 console.error('Error fetching customer from Razorpay:', error);
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Customer not found',
//                     error: error.message
//                 });
//             }
//         }

//         // Fetch plan details
//         console.log("planId fetching the plan", planId);
//         let plan = await Plan.findOne({ razorpayPlanId: planId });
//         console.log("plan", plan);

//         if (!plan) {
//             // Fetch plan details from Razorpay
//             //?this will alway be there in the razorpay
//             try {
//                 const razorpayPlan = await razorpay.plans.fetch(planId);

//                 console.log("creating the new razorpayPlan", razorpayPlan);

//                 // Determine billing period from plan or request
//                 const planBillingPeriod = billingPeriod ||
//                     (razorpayPlan.period === 'month' && razorpayPlan.interval === 3 ? 'quarterly' :
//                         razorpayPlan.period === 'year' ? 'yearly' : 'monthly');

//                 plan = new Plan({
//                     razorpayPlanId: planId,
//                     name: razorpayPlan.item.name,
//                     description: razorpayPlan.item.description,
//                     amount: razorpayPlan.item.amount / 100,
//                     currency: razorpayPlan.item.currency,
//                     interval: razorpayPlan.period,
//                     intervalCount: razorpayPlan.interval,
//                     billingPeriod: planBillingPeriod
//                 });

//                 await plan.save();
//             } catch (error) {
//                 console.error('Error fetching plan from Razorpay:', error);
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Plan not found',
//                     error: error.message
//                 });
//             }
//         }

//         let subscriptionEndDate = null;
//         if (plan.interval === "monthly") {
//             subscriptionEndDate = new Date();
//             subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + plan.intervalCount);
//         } else if (plan.interval === "yearly") {
//             subscriptionEndDate = new Date();
//             subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + plan.intervalCount);
//         }

//         // Set totalCount based on billing period if not specified
//         if (!req.body.totalCount) {
//             const planBillingPeriod = billingPeriod || plan.billingPeriod;
//             if (planBillingPeriod === 'yearly') {
//                 totalCount = 1; // One payment for annual
//             } else if (planBillingPeriod === 'quarterly') {
//                 totalCount = 4; // Four quarterly payments
//             } else if (planBillingPeriod === 'monthly') {
//                 totalCount = 12; // Twelve monthly payments
//             }
//         }

//         // UPDATED LOGIC: Check if the customer already has an active subscription for this plan
//         let subscriptionStartAt = null; // Will be determined based on logic below
//         let isRenewal = false;
//         let isFreeTrialEnabled = false;

//         console.log("plan.amount", plan.amount);

//         // Find active subscriptions for this customer and plan
//         const activeSubscription = await Subscription.findOne({
//             customerId: customer._id,
//             planId: plan._id,
//             status: { $in: ['active'] }
//         }).sort({ chargeAt: -1 }); // Get the most recent one

//         console.log('printing the activeSubscriptions', activeSubscription);

//         if (activeSubscription) {
//             // Customer already has an active subscription - this is a renewal
//             isRenewal = true;

//             // Set startAt to the next day after current subscription ends
//             const currentEndDate = new Date(activeSubscription.subscriptionEndDate);
//             currentEndDate.setDate(currentEndDate.getDate() + 1); // Next day
//             currentEndDate.setHours(0, 0, 0, 0); // Start of the day
//             subscriptionStartAt = Math.floor(currentEndDate.getTime() / 1000);
//             console.log("RENEWAL: Customer has an active subscription. Next subscription will start at:", new Date(subscriptionStartAt * 1000));
//         } else {
//             // First-time subscription - starts immediately, with 7-day free trial
//             //isFreeTrialEnabled = true;

//             // First-time subscription starts immediately (the trial starts now)
//             // We don't set start_at for first-time subscriptions to let it start immediately
//             subscriptionStartAt = Math.floor(Date.now() / 1000); // Let Razorpay start it immediately
//             console.log("NEW SUBSCRIBER: creating the subscription");


//             // Create subscription options
//             const subscriptionOptions = {
//                 plan_id: planId,
//                 total_count: totalCount,
//                 customer_id: customerId,
//                 quantity: 1,
//                 customer_notify: 1,
//                 notes: {
//                     created_at: new Date().toISOString(),
//                     created_by: customerId,
//                     userId: req.user ? req.user.id : null,
//                     billingPeriod: billingPeriod || plan.billingPeriod,
//                     isRenewal: isRenewal,
//                     isFreeTrialEnabled: isFreeTrialEnabled
//                 }
//             };

//             // Only set start_at for renewals, not for first-time subscriptions
//             if (isRenewal && subscriptionStartAt) {
//                 subscriptionOptions.start_at = subscriptionStartAt;
//                 subscriptionOptions.notes.scheduledStart = new Date(subscriptionStartAt * 1000).toISOString();
//             }


//             // Add expire_by if needed (for auto-cancellation if not authorized)
//             if (isRenewal && subscriptionStartAt) {
//                 // Set expiry to 7 days from now or 1 day before start_at, whichever is earlier
//                 const sevenDaysFromNow = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
//                 const oneDayBeforeStart = subscriptionOptions.start_at - 24 * 60 * 60;
//                 subscriptionOptions.expire_by = Math.min(oneDayBeforeStart, sevenDaysFromNow);
//             } else {
//                 // For immediate subscriptions, set to expire after 7 days if not authenticated
//                 subscriptionOptions.expire_by = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
//             }

//             console.log("Subscription options being sent to Razorpay:", JSON.stringify(subscriptionOptions, null, 2));

//             // Verify the plan exists in Razorpay before trying to create subscription
//             try {
//                 const planCheck = await razorpay.plans.fetch(planId);
//                 console.log("Plan exists in Razorpay:", planCheck.id);
//             } catch (error) {
//                 console.error("Plan doesn't exist in Razorpay:", error.error.description);
//                 return res.status(404).json({
//                     success: false,
//                     message: "The plan ID doesn't exist in Razorpay",
//                     error: error.error
//                 });
//             }

//             // Create subscription in Razorpay
//             const subscription = await razorpay.subscriptions.create(subscriptionOptions);
//             console.log("subscription", subscription);

//             // Create subscription in our database
//             const newSubscription = new Subscription({
//                 razorpaySubscriptionId: subscription.id,
//                 customerId: customer._id,
//                 planId: plan._id,
//                 subscriptionEndDate: subscriptionEndDate,
//                 status: subscription.status,
//                 startAt: subscription.start_at ? new Date(subscription.start_at * 1000) : new Date(),
//                 chargeAt: subscription.charge_at ? new Date(subscription.charge_at * 1000) : new Date(),
//                 totalCount: subscription.total_count,
//                 paidCount: subscription.paid_count,
//                 billingPeriod: billingPeriod || plan.billingPeriod,
//                 notes: {
//                     ...subscription.notes,
//                     pendingActivation: true,
//                     isScheduled: isRenewal,
//                     isRenewal: isRenewal,
//                     isFreeTrialEnabled: isFreeTrialEnabled,
//                     trialEndDate: isFreeTrialEnabled ? subscriptionOptions.notes.trialEndDate : null
//                 }
//             });

//             await newSubscription.save();


//             // Return subscription details
//             res.status(200).json({
//                 success: true,
//                 subscription: {
//                     id: subscription.id,
//                     status: subscription.status,
//                     startAt: subscription.start_at,
//                     chargeAt: subscription.charge_at,
//                     current_start: subscription.current_start,
//                     current_end: subscription.current_end,
//                     plan_id: subscription.plan_id,
//                     total_count: subscription.total_count,
//                     paid_count: subscription.paid_count,
//                     customer_notify: subscription.customer_notify,
//                     short_url: subscription.short_url,
//                     billingPeriod: billingPeriod || plan.billingPeriod,
//                     isRenewal: isRenewal,
//                     isFreeTrialEnabled: isFreeTrialEnabled,
//                     trialEndDate: isFreeTrialEnabled ? subscriptionOptions.notes.trialEndDate : null
//                 },
//                 customer: {
//                     id: customer._id,
//                     razorpayCustomerId: customer.razorpayCustomerId,
//                     name: customer.name,
//                     email: customer.email
//                 },
//                 plan: {
//                     id: plan._id,
//                     razorpayPlanId: plan.razorpayPlanId,
//                     name: plan.name,
//                     amount: plan.amount,
//                     currency: plan.currency,
//                     interval: plan.interval,
//                     billingPeriod: plan.billingPeriod
//                 }
//             });
//         }

//     } catch (error) {
//         console.error('Error creating subscription:', error);

//         // Handle specific Razorpay errors
//         if (error.error) {
//             return res.status(error.statusCode || 400).json({
//                 success: false,
//                 message: error.error.description || 'Failed to create subscription',
//                 error: error.error
//             });
//         }

//         res.status(500).json({
//             success: false,
//             message: 'Failed to create subscription',
//             error: error.message
//         });
//     }
// };

export const createSubscription1 = async (req, res) => {
    console.log("createSubscription", req.body);
    let { planId, customerId, totalCount = 12, billingPeriod } = req.body;

    try {
        await connectDB();

        if (!customerId) {
            return res.status(400).json({ success: false, message: 'Customer ID is required' });
        }

        if (!planId) {
            return res.status(400).json({ success: false, message: 'Plan ID is required' });
        }

        // 1. Find or create customer in DB
        let customer = await Customer.findOne({ razorpayCustomerId: customerId });

        if (!customer) {
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
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found',
                    error: error.message
                });
            }
        }

        // 2. Find or create plan in DB
        let plan = await Plan.findOne({ razorpayPlanId: planId });

        if (!plan) {
            try {
                const razorpayPlan = await razorpay.plans.fetch(planId);
                const planBillingPeriod = billingPeriod ||
                    (razorpayPlan.period === 'month' && razorpayPlan.interval === 3 ? 'quarterly' :
                        razorpayPlan.period === 'year' ? 'yearly' : 'monthly');

                plan = new Plan({
                    razorpayPlanId: planId,
                    name: razorpayPlan.item.name,
                    description: razorpayPlan.item.description,
                    amount: razorpayPlan.item.amount / 100,
                    currency: razorpayPlan.item.currency,
                    interval: razorpayPlan.period,
                    intervalCount: razorpayPlan.interval,
                    billingPeriod: planBillingPeriod
                });
                await plan.save();
            } catch (error) {
                return res.status(404).json({
                    success: false,
                    message: 'Plan not found',
                    error: error.message
                });
            }
        }

        // 3. Determine totalCount based on billing period if not set
        if (!req.body.totalCount) {
            const planBillingPeriod = billingPeriod || plan.billingPeriod;
            if (planBillingPeriod === 'yearly') totalCount = 1;
            else if (planBillingPeriod === 'quarterly') totalCount = 4;
            else totalCount = 12;
        }

        // 4. Determine subscription start logic
        let isRenewal = false;
        let subscriptionStartAt = null;

        const activeSubscription = await Subscription.findOne({
            customerId: customer._id,
            planId: plan._id,
            status: 'active'
        }).sort({ chargeAt: -1 });

        if (activeSubscription) {
            isRenewal = true;
            const currentEndDate = new Date(activeSubscription.subscriptionEndDate);
            currentEndDate.setDate(currentEndDate.getDate() + 1);
            currentEndDate.setHours(0, 0, 0, 0);
            subscriptionStartAt = Math.floor(currentEndDate.getTime() / 1000);
        } else {
            subscriptionStartAt = Math.floor(Date.now() / 1000);
        }

        // 5. Build Razorpay subscription options
        const subscriptionOptions = {
            plan_id: planId,
            total_count: totalCount,
            customer_id: customerId,
            quantity: 1,
            customer_notify: 1,
            notes: {
                created_at: new Date().toISOString(),
                created_by: customerId,
                userId: req.user ? req.user.id : null,
                billingPeriod: billingPeriod || plan.billingPeriod,
                isRenewal
            }
        };

        if (isRenewal && subscriptionStartAt) {
            subscriptionOptions.start_at = subscriptionStartAt;
            subscriptionOptions.notes.scheduledStart = new Date(subscriptionStartAt * 1000).toISOString();

            const oneDayBeforeStart = subscriptionStartAt - 24 * 60 * 60;
            const sevenDaysFromNow = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
            subscriptionOptions.expire_by = Math.min(oneDayBeforeStart, sevenDaysFromNow);
        } else {
            subscriptionOptions.expire_by = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
        }

        console.log("Creating subscription with options:", subscriptionOptions);

        // 6. Final safety check: ensure plan exists in Razorpay
        try {
            await razorpay.plans.fetch(planId);
        } catch (error) {
            return res.status(404).json({
                success: false,
                message: "The plan ID doesn't exist in Razorpay",
                error: error.error
            });
        }

        // 7. Create subscription in Razorpay
        const subscription = await razorpay.subscriptions.create(subscriptionOptions);

        // 8. Calculate subscription end date
        let subscriptionEndDate = new Date();
        if (plan.interval === "monthly") {
            subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + plan.intervalCount * totalCount);
        } else if (plan.interval === "yearly") {
            subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + plan.intervalCount * totalCount);
        }

        // 9. Save to DB
        const newSubscription = new Subscription({
            razorpaySubscriptionId: subscription.id,
            customerId: customer._id,
            planId: plan._id,
            subscriptionEndDate,
            status: subscription.status,
            startAt: subscription.start_at ? new Date(subscription.start_at * 1000) : new Date(),
            chargeAt: subscription.charge_at ? new Date(subscription.charge_at * 1000) : new Date(),
            totalCount: subscription.total_count,
            paidCount: subscription.paid_count,
            billingPeriod: billingPeriod || plan.billingPeriod,
            notes: {
                ...subscription.notes,
                isScheduled: isRenewal,
                isRenewal
            }
        });

        await newSubscription.save();

        // 10. Send response
        res.status(200).json({
            success: true,
            subscription: {
                id: subscription.id,
                status: subscription.status,
                startAt: subscription.start_at,
                chargeAt: subscription.charge_at,
                current_start: subscription.current_start,
                current_end: subscription.current_end,
                plan_id: subscription.plan_id,
                total_count: subscription.total_count,
                paid_count: subscription.paid_count,
                customer_notify: subscription.customer_notify,
                short_url: subscription.short_url,
                billingPeriod: billingPeriod || plan.billingPeriod,
                isRenewal
            },
            customer: {
                id: customer._id,
                razorpayCustomerId: customer.razorpayCustomerId,
                name: customer.name,
                email: customer.email
            },
            plan: {
                id: plan._id,
                razorpayPlanId: plan.razorpayPlanId,
                name: plan.name,
                amount: plan.amount,
                currency: plan.currency,
                interval: plan.interval,
                billingPeriod: plan.billingPeriod
            }
        });

    } catch (error) {
        console.error('Error creating subscription:', error);
        if (error.error) {
            return res.status(error.statusCode || 400).json({
                success: false,
                message: error.error.description || 'Failed to create subscription',
                error: error.error
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create subscription',
            error: error.message
        });
    }
};

export const createSubscription = async (req, res) => {
    try {
        const { planType, totalCount, customerId } = req.body;
        // const userId = req.user.id;

        //  let customer = await Customer.findOne({ razorpayCustomerId: customerId });

        // Determine the start date for the new subscription
        let startDate = new Date();
        // Check if the user currently has an active subscription that hasn't ended
        const currentSub = await Subscription.findOne({ customerId: customerId, status: 'active' });
        if (currentSub && currentSub.subscriptionEndDate >= new Date()) {
            // If an active subscription exists, start new one the day after the current ends
            startDate = new Date(currentSub.subscriptionEndDate);
            startDate.setDate(startDate.getDate() + 1);  // next day after current end
        }

        // Calculate the end date based on billing interval and totalCount
        let endDate = new Date(startDate);
        if (planType === 'quarterly') {
            // 3 months per quarter
            endDate.setMonth(endDate.getMonth() + 3 * totalCount);
        } else if (planType === 'yearly') {
            // 12 months per year
            endDate.setFullYear(endDate.getFullYear() + 1 * totalCount);
        }
        endDate.setDate(endDate.getDate() - 1);  // subtract 1 day so endDate is inclusive of last period

        // Prepare Razorpay subscription creation options
        const options = {
            plan_id: getRazorpayPlanId(planType),  // function to get plan ID based on planType
            total_count: totalCount,
            customer_notify: 1
        };
        if (startDate > new Date()) {
            // Schedule future start (Razorpay expects Unix timestamp in seconds)
            options.start_at = Math.floor(startDate.getTime() / 1000);
        }

        // Create subscription via Razorpay API
        const razorpaySub = await razorpayClient.subscriptions.create(options);
        // Save the new subscription record in our database
        const newSubscription = await Subscription.create({
            userId: userId,
            razorpaySubscriptionId: razorpaySub.id,
            planType: planType,
            subscriptionStartDate: startDate,
            subscriptionEndDate: endDate,
            status: 'pending'  // will be updated to 'active' upon webhook confirmation
        });

        return res.status(200).json({ success: true, data: newSubscription });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
}


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

export const config = {
    api: {
        bodyParser: false, // Disable automatic JSON parsing in Vercel
    },
};

// Process webhook events
export const handleWebhook = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // Respond immediately to prevent timeout
    res.status(200).json({ message: 'Webhook received' });

    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const skipVerification = process.env.SKIP_WEBHOOK_VERIFICATION === 'true';
        const signature = req.headers['x-razorpay-signature'];

        // Raw body should be available as buffer from our middleware
        if (!req.rawBody) {
            console.error('Raw body not captured. Check middleware configuration.');
            return;
        }

        // Skip signature verification in development if configured
        if (!skipVerification) {
            if (!signature) {
                console.warn('No signature found in webhook request');
                return; // Already sent response, so just return
            }

            try {
                const hmac = crypto.createHmac('sha256', webhookSecret);
                hmac.update(req.rawBody);
                const calculatedSignature = hmac.digest('hex');

                console.log('Expected:', calculatedSignature);
                console.log('Received:', signature);

                if (signature !== calculatedSignature) {
                    console.error('Invalid webhook signature');
                    return; // Already sent response, so just return
                }
            } catch (error) {
                console.error('Error verifying signature:', error);
                return; // Already sent response, so just return
            }
        } else {
            console.log('Skipping webhook signature verification in development mode');
        }

        // Parse and process the webhook event asynchronously
        try {
            // We can use req.body since our middleware should have parsed it
            const event = req.body;
            console.log('Webhook event received:', event.event);

            // Process the event asynchronously
            processWebhookEventAsync(event).catch(err =>
                console.error('Error processing webhook event:', err)
            );
        } catch (error) {
            console.error('Error parsing webhook event:', error);
        }
    } catch (error) {
        console.error('Error in webhook handler:', error);
    }
};

// Process webhook events asynchronously

const processWebhookEventAsync = async (event) => {
    try {
        await connectDB();

        switch (event.event) {
            case 'payment.captured':
                await updatePaymentStatus(event.payload.payment.entity.id, 'captured', event.payload.payment.entity);
                break;
            case 'payment.failed':
                await updatePaymentStatus(event.payload.payment.entity.id, 'failed', event.payload.payment.entity);
                break;
            case 'payment.refunded':
                await updatePaymentStatus(event.payload.payment.entity.id, 'refunded', event.payload.payment.entity);
                break;
            case 'subscription.charged':
                await updateSubscriptionCharged(event.payload.subscription.entity.id, event.payload.subscription.entity);
                break;
            case 'subscription.activated':
                await updateSubscriptionStatus(event.payload.subscription.entity.id, 'active', event.payload.subscription.entity);
                break;
            case 'subscription.deactivated':
                await updateSubscriptionStatus(event.payload.subscription.entity.id, 'halted', event.payload.subscription.entity);
                break;
            case 'subscription.ended':
                await updateSubscriptionStatus(event.payload.subscription.entity.id, 'completed', event.payload.subscription.entity);
                break;
            case 'order.paid':
                await updateOrderPaid(event.payload.order.entity.id, event.payload.order.entity);
                break;
            case 'invoice.paid':
                await updateInvoiceStatus(event.payload.invoice.entity.id, 'paid', event.payload.invoice.entity);
                break;
            default:
                console.log('Unhandled webhook event type:', event.event);
        }
    } catch (error) {
        console.error('Error processing webhook event:', error.message);
    }
};

const updatePaymentStatus = async (paymentId, status, paymentData) => {
    try {
        await connectDB();

        let payment = await Payment.findOne({ razorpayPaymentId: paymentId });

        if (payment) {
            payment.status = status;
            payment.paymentDetails = paymentData;
            await payment.save();
        } else {
            let customerId = null;
            if (paymentData.customer_id) {
                const customer = await Customer.findOne({ razorpayCustomerId: paymentData.customer_id });
                if (customer) customerId = customer._id;
            }

            payment = new Payment({
                razorpayPaymentId: paymentId,
                razorpayOrderId: paymentData.order_id,
                customerId,
                amount: paymentData.amount / 100,
                currency: paymentData.currency,
                status,
                method: paymentData.method,
                paymentDetails: paymentData
            });

            await payment.save();
        }
    } catch (error) {
        console.error(Error`updating payment ${paymentId}`, error);
    }
};

async function updateSubscriptionStatus(req, res) {
    try {
        const event = req.body.event;
        const subEntity = req.body.payload.subscription.entity;
        const razorpaySubId = subEntity.id;

        // Find the corresponding subscription in our database
        const subscription = await Subscription.findOne({ razorpaySubscriptionId: razorpaySubId });
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        if (event === 'subscription.activated') {
            // Mark subscription as active and update start/end dates from Razorpay data
            subscription.status = 'active';
            if (subEntity.current_start) {
                subscription.subscriptionStartDate = new Date(subEntity.current_start * 1000);
            } else {
                // Fallback to scheduled start_at if current_start is not set
                subscription.subscriptionStartDate = new Date(subEntity.start_at * 1000);
            }
            if (subEntity.end_at) {
                subscription.subscriptionEndDate = new Date(subEntity.end_at * 1000);
            }
            await subscription.save();
        } else if (
            event === 'subscription.completed' ||
            event === 'subscription.expired' ||
            event === 'subscription.cancelled'
        ) {
            // Mark subscription as ended
            subscription.status = 'completed';  // or 'expired/cancelled' based on event
            await subscription.save();
        }

        res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
}


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