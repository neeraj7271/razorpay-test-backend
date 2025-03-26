import express from "express";
import dotenv from "dotenv";
import orderRoutes from './routes/orderRoutes'; // Import the order routes

dotenv.config();

const app = express();
const port = process.env.port || 5000;

app.use(express.json()); // Middleware to parse JSON bodies
app.use('/api', orderRoutes); // Use the order routes

app.listen(port, () => {
    console.log(`Server is running on the port ${port}`)
})