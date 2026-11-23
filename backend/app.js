import 'dotenv/config';
import express from 'express';
import session from 'express-session';

import authRouter from './routes/authRoutes.js';
import partyRouter from './routes/partyRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import competitionRouter from './routes/competitionRoutes.js';
import submissionRouter from './routes/submissionRoutes.js';
import leaderboardRouter from './routes/leaderboardRoutes.js';

const app = express();

const BASE_URL = '/api/v1';

// Middleware
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'development-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60
    }
}));

// Health check
app.get(`${BASE_URL}/health`, (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'API IS UP AND RUNNING',
        timestamp: new Date()
    });
});

// Routes
app.use(`${BASE_URL}/auth`, authRouter);
app.use(`${BASE_URL}/parties`, partyRouter);
app.use(`${BASE_URL}/submission`, submissionRouter);
app.use(BASE_URL, sessionRoutes);
app.use(BASE_URL, competitionRouter);
app.use(BASE_URL, leaderboardRouter);

export default app;