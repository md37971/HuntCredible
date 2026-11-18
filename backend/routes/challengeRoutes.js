import express from "express";
import { getDb } from "../db.js";
import { ObjectId } from "mongodb";
const router = express.Router();

// GET /api/v1/challenges - Retrieves all active challenges
router.get("/challenges", async (req, res) => {
    try {
        const now = new Date();

        // Finds challenges that are currently active.
        const challenges = await getDb().collection("challenges")
            .find({
                status: "active",
                startDate: { $lte: now },
                endDate: { $gte: now }
            })
            .toArray();

        return res.status(200).json({
            success: true,
            data: challenges
        });

    } catch (error) {
        console.error("Error retrieving challenges:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to retrieve challenges" }
        });
    }
});

// GET /api/v1/challenges/:challengeId - Retrieves a specific challenge
router.get("/challenges/:challengeId", async (req, res) => {
    try {
        const { challengeId } = req.params;

        if (!ObjectId.isValid(challengeId)) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Invalid challenge ID" }
            });
        }

        // Finds the challenge using its MongoDB ID.
        const challenge = await getDb().collection("challenges").findOne({
            _id: new ObjectId(challengeId)
        });

        if (!challenge) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "Challenge not found" }
            });
        }

        return res.status(200).json({
            success: true,
            data: challenge
        });

    } catch (error) {
        console.error("Error retrieving challenge:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to retrieve challenge" }
        });
    }
});

// GET /api/v1/users/me/challenges - Retrieves the logged-in user's challenges
router.get("/users/me/challenges", async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: "Unauthorized",
                content: { message: "You must be logged in" }
            });
        }

        const userId = req.session.user._id;

        // Finds all challenge records belonging to the logged-in user.
        const userChallenges = await getDb().collection("userChallenges")
            .find({ userId: userId })
            .toArray();

        // Retrieves the challenge information for each user challenge.
        const results = [];

        for (const userChallenge of userChallenges) {
            const challenge = await getDb().collection("challenges").findOne({
                _id: userChallenge.challengeId
            });

            results.push({
                ...userChallenge,
                challenge: challenge
            });
        }

        return res.status(200).json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error("Error retrieving user challenges:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to retrieve user challenges" }
        });
    }
});


// POST /api/v1/challenges/:challengeId/submit - Submits a challenge photo


// GET /api/v1/challenges/:challengeId/submissions - Retrieves challenge submissions
router.get("/challenges/:challengeId/submissions", async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: "Unauthorized",
                content: { message: "You must be logged in" }
            });
        }

        const { challengeId } = req.params;

        if (!ObjectId.isValid(challengeId)) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Invalid challenge ID" }
            });
        }

        // Makes sure the challenge exists.
        const challenge = await getDb().collection("challenges").findOne({
            _id: new ObjectId(challengeId)
        });

        if (!challenge) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "Challenge not found" }
            });
        }

        // Retrieves all users who submitted a photo for this challenge.
        const submissions = await getDb().collection("userChallenges")
            .find({
                challengeId: new ObjectId(challengeId),
                submission: { $exists: true }
            })
            .sort({ "submission.submittedAt": -1 })
            .toArray();

        return res.status(200).json({
            success: true,
            data: submissions
        });

    } catch (error) {
        console.error("Error retrieving challenge submissions:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to retrieve challenge submissions" }
        });
    }
});

export default router;
