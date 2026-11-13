import express from 'express';
import dotenv from 'dotenv';
import { connectDb } from './db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || "5000";

app.use(express.json());
const BASE_URL = "/api/v1";

//Health Check
app.get(`${BASE_URL}/health`, (req, res) => {
    res.status(200).json({ 
        status: 'OK',
        message: 'API IS UP AND RUNNING',
        timestamp: new Date()
    });
});

// Starting connection
async function startServer() {
    try {
        await connectDb();
        app.listen(port, () => {
            console.log(`Server running on localhost:${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();