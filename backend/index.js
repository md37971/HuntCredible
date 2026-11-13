import express from 'express';
import dotenv from 'dotenv';
import { connectDb } from './db.js';
import authRouter from './endpoints/auth.js';

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

app.use(`${BASE_URL}/auth`, authRouter);

// Starting connection
async function startServer() {
    try {
        await connectDb();
        app.listen(port, () => {
            console.log(`Server running on localhost:${port}`);
        });
        app.get('/', (req, res) => {
            res.send('Express server is running!');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();