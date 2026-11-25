
import express from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
const router = express.Router();

// GET /leaderboard - Retrieve global leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ message: 'Not logged in' });
        }

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        const ranked = { points: { $gt: 0 }, role: { $ne: 'admin' } };

        const users = await getDb().collection('users')
            .find(ranked)
            .sort({ points: -1, _id: 1 })
            .skip(skip)
            .limit(limit)
            .project({
                firstName: 1,
                lastName: 1,
                points: 1
            })
            .toArray();

        let currentRank = users.length === 0 ? 0 : await getDb().collection('users').countDocuments({
            ...ranked,
            points: { $gt: users[0].points }
        }) + 1;

        const leaderboard = users.map((user, index) => {
            if (index > 0 && user.points !== users[index - 1].points) {
                currentRank = skip + index + 1;
            }

            return {
                rank: currentRank,
                userId: user._id,
                username: `${user.firstName} ${user.lastName}`,
                points: user.points ?? 0
            };
        });

        res.json({
            success: true,
            data: { leaderboard, page, limit }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve leaderboard' });
    }
});

// GET /leaderboard/me - Retrieve user's ranking
router.get('/leaderboard/me', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ message: 'Not logged in' });
        }

        const userId = new ObjectId(req.session.user._id);
        const user = await getDb().collection('users').findOne({
            _id: userId
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const points = user.points ?? 0;
        const rank = points > 0 && user.role !== 'admin'
            ? await getDb().collection('users').countDocuments({
                points: { $gt: points },
                role: { $ne: 'admin' }
            }) + 1
            : null;

        res.json({
            success: true,
            data: {
                rank,
                userId: user._id,
                username: `${user.firstName} ${user.lastName}`,
                points: user.points ?? 0
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve ranking' });
    }
});

// GET /users/:userId/points - Retrieve user's points
router.get('/users/:userId/points', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ message: 'Not logged in' });
        }

        const { userId } = req.params;

        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        const isOwnAccount = req.session.user._id.toString() === userId;

        if (!isOwnAccount && req.session.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const user = await getDb().collection('users').findOne(
            { _id: new ObjectId(userId) },
            { projection: { points: 1 } }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            success: true,
            data: {
                userId: user._id,
                points: user.points ?? 0
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve points' });
    }
});

// GET /users/:userId/points/history - Retrieve points history
router.get('/users/:userId/points/history', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ message: 'Not logged in' });
        }

        const { userId } = req.params;

        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        const isOwnAccount = req.session.user._id.toString() === userId;

        if (!isOwnAccount && req.session.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const history = await getDb().collection('leaderboard')
            .find({ userId: new ObjectId(userId) })
            .sort({ createdAt: -1 })
            .toArray();

        res.json({
            success: true,
            data: { history }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to retrieve points history' });
    }
});

// GET /competitions/:competitionId/leaderboard - Retrieve competition rankings
router.get('/competitions/:competitionId/leaderboard', async (req, res) => {
    try {
        const { competitionId } = req.params;

        if (!ObjectId.isValid(competitionId)) {
            return res.status(400).json({
                message: 'Invalid competition ID'
            });
        }

        const competitionObjectId = new ObjectId(competitionId);
        const db = getDb();

        // Check if competition exists.
        const competition = await db.collection('competitions').findOne({
            _id: competitionObjectId
        });

        if (!competition) {
            return res.status(404).json({
                message: 'Competition not found'
            });
        }

        // Get approved submissions for this competition.
        const submissions = await db.collection('userEntries')
            .find({
                competitionId: competitionObjectId,
                status: 'approved'
            })
            .toArray();

        // Calculate each user's total points.
        const userPoints = new Map();

        for (const submission of submissions) {
            const userId = submission.userId.toString();

            userPoints.set(
                userId,
                (userPoints.get(userId) || 0) + (submission.pointsAwarded || 0)
            );
        }

        // Sort users by highest points.
        const sortedUsers = Array.from(userPoints.entries())
            .sort((a, b) => b[1] - a[1]);

        // Get user information.
        const users = await db.collection('users').find({
            _id: {
                $in: sortedUsers.map(([userId]) => new ObjectId(userId))
            }
        }).project({
            firstName: 1,
            lastName: 1
        }).toArray();

        // Create competition leaderboard.
        let currentRank = 0;

        const leaderboard = sortedUsers.map(([userId, points], index) => {
            if (index === 0 || points !== sortedUsers[index - 1][1]) {
                currentRank = index + 1;
            }

            const user = users.find(
                user => user._id.toString() === userId
            );

            return {
                rank: currentRank,
                userId,
                username: user
                    ? `${user.firstName} ${user.lastName}`
                    : 'Unknown User',
                points
            };
        });

        res.json({
            success: true,
            data: {
                competitionId,
                leaderboard
            }
        });

    } catch (error) {
        console.error('Error retrieving competition leaderboard:', error);

        res.status(500).json({
            message: 'Failed to retrieve competition leaderboard'
        });
    }
});

export default router;