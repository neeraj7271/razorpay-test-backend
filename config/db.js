import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Cache the database connection
let cachedConnection = null;

const connectDB = async () => {
    // If we have a cached connection, use it
    if (cachedConnection) {
        console.log('Using cached MongoDB connection');
        return cachedConnection;
    }

    try {
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            bufferCommands: false, // Disable command buffering
            serverSelectionTimeoutMS: 15000, // Increase timeout to 15 seconds
            socketTimeoutMS: 30000, // Increase socket timeout to 30 seconds
            maxPoolSize: 10, // Keep up to 10 connections open
            connectTimeoutMS: 15000, // How long to try connecting
        };

        // Connect to MongoDB
        const conn = await mongoose.connect(process.env.MONGODB_URI, options);

        // Cache the connection
        cachedConnection = conn;

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Add error handler for disconnects
        mongoose.connection.on('error', err => {
            console.error('MongoDB connection error:', err);
            cachedConnection = null; // Reset the cache if there's an error
        });

        // Handle disconnections
        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Will reconnect on next request.');
            cachedConnection = null;
        });

        return conn;
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        // Don't crash the server on connection error in production
        if (process.env.NODE_ENV === 'development') {
            process.exit(1);
        }
        throw error;
    }
};

export default connectDB; 