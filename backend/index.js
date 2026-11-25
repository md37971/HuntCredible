import app from './app.js';
import 'dotenv/config';
import { connectDb } from './db.js';

const port = process.env.PORT || "5000";

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