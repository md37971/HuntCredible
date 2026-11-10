import express from 'express';
import dotenv from 'dotenv';
import { connectDb } from './db.js';

dotenv.config();

const app = express();

app.use(express.json());

// Connect to MongoDB
await connectDb();

// Test endpoint
app.get('/', (req, res) => {
    res.send('Express server is running!');
});

app.listen(5000, () => {
    console.log('Server running on port 5000');
});