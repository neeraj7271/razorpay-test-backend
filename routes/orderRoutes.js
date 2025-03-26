import express from 'express';
import { createOrder } from '../controllers/orderController';

const router = express.Router();

// Route for creating an order
router.post('/create-order', createOrder);

export default router; 