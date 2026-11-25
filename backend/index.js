import app from './app.js';
import 'dotenv/config';
import { connectDb } from './db.js';
import { finalizeEndedCompetitions } from './services/competitionService.js';

const port = process.env.PORT || "5000";

const checkComp = 5 * 60 * 1000;

async function finalizeCompetitions() {
    try {
        const finalized = await finalizeEndedCompetitions();
        if (finalized > 0) {
            console.log(`Finalized ${finalized} competition(s).`);
        }
    } catch (error) {
        console.error('Failed to finalize competitions:', error);
    }
}

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

        finalizeCompetitions();
        setInterval(finalizeCompetitions, checkComp);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
