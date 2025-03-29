# Razorpay Integration API

This is a Node.js application that integrates with the Razorpay API for payment processing, subscription management, and user authentication. The application includes admin functionalities for managing plans and subscriptions.

## Table of Contents

- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication)
  - [User Routes](#user-routes)
  - [Order Routes](#order-routes)
  - [Admin Routes](#admin-routes)
- [Testing the API](#testing-the-api)
- [Frontend Integration](#frontend-integration)
- [Webhook Handling](#webhook-handling)
- [Development Mode](#development-mode)

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd razorpay-integration
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your environment variables (see [Environment Variables](#environment-variables)).

4. Create an admin user:

   ```bash
   npm run create-admin
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Razorpay Keys
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Development Settings
SKIP_WEBHOOK_VERIFICATION=true
```

## API Endpoints

### Authentication

1. **Register a New User**

   - **URL**: `POST /api/auth/register`
   - **Request Body**:
     ```json
     {
       "name": "John Doe",
       "email": "john@example.com",
       "password": "123456",
       "phone": "1234567890"
     }
     ```

2. **Login**

   - **URL**: `POST /api/auth/login`
   - **Request Body**:
     ```json
     {
       "email": "john@example.com",
       "password": "123456"
     }
     ```
   - **Response**: Returns a JWT token for authentication.

3. **Get User Profile**

   - **URL**: `GET /api/auth/profile`
   - **Headers**:
     ```
     Authorization: Bearer <token>
     ```
   - **Response**: Returns the user profile, customer information, active subscription, subscription history, and transaction history.
   - **Response Example**:
     ```json
     {
       "success": true,
       "data": {
         "user": {
           "id": "user_id",
           "name": "John Doe",
           "email": "john@example.com",
           "phone": "1234567890",
           "role": "user"
         },
         "customer": {
           "id": "customer_id",
           "razorpayCustomerId": "cust_123456789",
           "name": "John Doe",
           "email": "john@example.com",
           "contact": "1234567890"
         },
         "activeSubscription": {
           /* active subscription data */
         },
         "subscriptionHistory": [
           /* array of subscriptions */
         ],
         "transactions": [
           /* array of payment transactions */
         ]
       }
     }
     ```

4. **Logout**
   - **URL**: `GET /api/auth/logout`
   - **Response**: Clears the authentication cookie.

### User Routes

1. **Get All Customers for the Current User**

   - **URL**: `GET /api/customers`
   - **Headers**:
     ```
     Authorization: Bearer <token>
     ```
   - **Response**: Returns all customers associated with the current user.

2. **Get All Subscriptions for the Current User**

   - **URL**: `GET /api/subscriptions`
   - **Headers**:
     ```
     Authorization: Bearer <token>
     ```
   - **Response**: Returns all subscriptions associated with the current user.

3. **Get Subscription Details**

   - **URL**: `GET /api/subscriptions/:subscriptionId`
   - **Headers**:
     ```
     Authorization: Bearer <token>
     ```
   - **Response**: Returns detailed information about a specific subscription and its related payments.

4. **Check Subscription Status**

   - **URL**: `POST /api/check-subscription/:subscriptionId`
   - **Headers**:
     ```
     Authorization: Bearer <token>
     ```
   - **Response**: Checks the current status of a subscription with Razorpay and updates the local database if needed.
   - **Note**: This is particularly useful in development mode where webhooks are not available.

5. **Get Transaction History**

   - **URL**: `GET /api/transactions`
   - **Headers**:
     ```
     Authorization: Bearer <token>
     ```
   - **Response**: Returns all payment transactions for the current user.

6. **Validate Discount on a Subscription**
   - **URL**: `GET /api/validate-discount/:subscriptionId`
   - **Headers**:
     ```
     Authorization: Bearer <token>
     ```
   - **Response**: Returns information about whether a discount was applied to the subscription.

### Order Routes

1. **Create a Customer**

   - **URL**: `POST /api/create-customer`
   - **Headers**:
     ```
     Authorization: Bearer <token>
     ```
   - **Request Body**:
     ```json
     {
       "name": "John Doe",
       "email": "john@example.com",
       "contact": "1234567890"
     }
     ```
   - **Response**: Returns the created customer with the Razorpay customer ID.
   - **Notes**: If you're already logged in, your user data will be used to automatically create the customer.

2. **Create an Order**

   - **URL**: `POST /api/create-order`
   - **Headers**:
     ```
     Authorization: Bearer <token>
     ```
   - **Request Body**:
     ```json
     {
       "amount": 1000,
       "currency": "INR",
       "receipt": "order_receipt_1"
     }
     ```
   - **Response**: Returns the created order.
   - **Notes**: If you're logged in, a customer will be automatically created or fetched for you.

3. **Get Available Plans**

   - **URL**: `GET /api/plans`
   - **Response**: Returns a list of available subscription plans.

4. **Create a Subscription**

   - **URL**: `POST /api/create-subscription`
   - **Headers**:
     ```
     Authorization: Bearer <token>
     ```
   - **Request Body**:
     ```json
     {
       "planId": "plan_id",
       "totalCount": 12
     }
     ```
   - **Response**: Returns the created subscription along with customer and plan details.
   - **Notes**: If you're logged in, a customer will be automatically created or fetched for you.

5. **Add an Addon to a Subscription**
   - **URL**: `POST /api/add-addon`
   - **Headers**:
     ```
     Authorization: Bearer <token>
     ```
   - **Request Body**:
     ```json
     {
       "subscriptionId": "subscription_id",
       "addons": [
         {
           "description": "Extra Storage",
           "amount": 500,
           "quantity": 1
         }
       ]
     }
     ```
   - **Response**: Returns the updated subscription with addons.

### Admin Routes

**Important**: All admin routes require the JWT token from an admin account in the Authorization header:

```
Authorization: Bearer <admin_token>
```

1. **Create a New Plan**

   - **URL**: `POST /api/admin/plans`
   - **Request Body**:
     ```json
     {
       "name": "Premium Plan",
       "description": "Premium features for enterprise customers",
       "amount": 2999,
       "currency": "INR",
       "interval": "month",
       "intervalCount": 1,
       "features": [
         "Unlimited Access",
         "24/7 Support",
         "Advanced Analytics",
         "Custom Reports"
       ]
     }
     ```
   - **Response**: Returns the created plan.

2. **Update an Existing Plan**

   - **URL**: `PUT /api/admin/plans/:id`
   - **Request Body**:
     ```json
     {
       "name": "Premium Plan Updated",
       "amount": 3499,
       "features": [
         "Unlimited Access",
         "24/7 Support",
         "Advanced Analytics",
         "Custom Reports",
         "API Access"
       ]
     }
     ```
   - **Response**: Returns the updated plan.

3. **Delete a Plan**

   - **URL**: `DELETE /api/admin/plans/:id`
   - **Response**: Returns a success message if the plan was deleted successfully.
   - **Notes**: Cannot delete plans with active subscriptions.

4. **Get All Subscriptions**

   - **URL**: `GET /api/admin/subscriptions`
   - **Response**: Returns a list of all subscriptions in the system.

5. **Apply Discount to a Subscription**

   - **URL**: `POST /api/admin/subscriptions/:subscriptionId/discount`
   - **Request Body**:
     ```json
     {
       "discountAmount": 20,
       "discountType": "percentage",
       "notes": "Special discount for loyal customer"
     }
     ```
   - **Response**: Returns the updated subscription with the applied discount.

6. **Extend a Subscription**
   - **URL**: `POST /api/admin/subscriptions/:subscriptionId/extend`
   - **Request Body**:
     ```json
     {
       "extensionMonths": 3,
       "reason": "Complimentary extension for service disruption"
     }
     ```
   - **Response**: Returns the updated subscription with the new end date.

## Testing the API

1. **Create Admin User (if not already created)**

   - Run the following command in your terminal:
     ```bash
     npm run create-admin
     ```

2. **Login as Admin**

   - Use the login endpoint to obtain the JWT token.

3. **Test Routes**
   - Use tools like Postman or cURL to send requests to the endpoints with the appropriate tokens.

## Sequence for Testing

1. Create an admin user using the create-admin script.
2. Login as admin to get the admin token.
3. Create plans with the admin account.
4. Register a regular user account.
5. Login as the regular user to get the user token.
6. Create a customer for the user.
7. Create a subscription for the customer.
8. Check subscription status using the manual check endpoint if webhooks aren't available.
9. Test discount validation and subscription retrieval.
10. As admin, apply a discount to the subscription.
11. Verify the discount was applied by using the validate-discount endpoint.

## Frontend Integration

When integrating with your frontend, you can use the `/api/auth/profile` endpoint to fetch all necessary user data in a single request. This includes:

1. **User information**: Basic user details like name, email, etc.
2. **Customer information**: The customer ID needed for Razorpay operations.
3. **Active subscription**: The currently active subscription.
4. **Subscription history**: All subscriptions for the user.
5. **Transaction history**: All payment transactions made by the user.

Typical frontend code to handle this data:

```javascript
// React example
useEffect(() => {
  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/auth/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setUserData(data.data.user);
        setCustomerData(data.data.customer);
        setActiveSubscription(data.data.activeSubscription);
        setSubscriptionHistory(data.data.subscriptionHistory || []);
        setTransactions(data.data.transactions || []);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  fetchUserProfile();
}, [token]);
```

## Webhook Handling

Razorpay sends webhook events for various actions like payment capture, subscription activation, etc. The application handles these events to update the database accordingly.

### Important Webhook Events

1. **subscription.activated**: When a subscription is activated after successful payment.
2. **subscription.charged**: When a subsequent charge is successfully processed for a subscription.
3. **payment.captured**: When a payment is successfully captured.

### Local Development vs Production

In production, Razorpay will send webhook events to your server URL. However, for local development, webhooks can't reach your localhost, so:

1. **Manual Status Checking**: Use the `/api/check-subscription/:subscriptionId` endpoint to manually check and update subscription status.
2. **Automatic Polling**: The application automatically polls Razorpay for subscription status changes after creation.
3. **Webhook Verification Skipping**: Set `SKIP_WEBHOOK_VERIFICATION=true` in development to skip signature verification.

## Development Mode

When running in development mode, the application enables special features to make testing easier:

1. **Automatic Status Polling**: Checks subscription status shortly after creation.
2. **Manual Status Checking**: Endpoint to force-check subscription status.
3. **Webhook Verification Skipping**: Option to skip webhook signature verification.
4. **Detailed Logging**: More verbose logs to help debug issues.

To use these features, make sure:

1. `NODE_ENV=development` in your `.env` file.
2. `SKIP_WEBHOOK_VERIFICATION=true` if testing webhooks locally.

This API provides a robust integration with Razorpay for managing payments and subscriptions, with admin functionalities to manage plans and apply discounts. Make sure to secure your application and follow best practices for handling sensitive information.
