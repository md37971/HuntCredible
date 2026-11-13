import express from "express"
const router = express.Router();

// Responds to GET /api/v1/example
router.get('/', (req, res) => {
    res.json({ message: 'Hello from the example route!' });
});

export default router;