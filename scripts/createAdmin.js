import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import connectDB from '../config/db.js';

dotenv.config();

// Function to create an admin user if one doesn't exist
const createAdminUser = async () => {
    try {
        // Connect to the database
        await connectDB();

        // Check if admin already exists
        const adminExists = await User.findOne({ role: 'admin' });

        if (adminExists) {
            console.log('Admin user already exists');
            return;
        }

        // Create admin user
        const admin = new User({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'admin123', // This will be hashed by the pre-save hook
            role: 'admin',
            isAdmin: true
        });

        await admin.save();
        console.log('Admin user created successfully');

    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        // Disconnect from the database
        setTimeout(() => {
            mongoose.disconnect();
        }, 1000);
    }
};

// Run the function
createAdminUser(); 