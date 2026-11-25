import { ObjectId } from "mongodb";
import { getDb } from "../db.js";

export async function finalizeEndedCompetitions() {
    const now = new Date();
    const db = getDb();

    const endedCompetitions = await db.collection("competitions")
        .find({
            endDate: { $lt: now },
            pointsAwardedAt: null,
            status: { $nin: ["draft", "cancelled"] }
        })
        .project({ title: 1, pointsReward: 1 })
        .toArray();

    let finalized = 0;

    for (const competition of endedCompetitions) {
        const claim = await db.collection("competitions").updateOne(
            { _id: competition._id, pointsAwardedAt: null },
            { $set: { pointsAwardedAt: now, status: "ended" } }
        );

        if (claim.modifiedCount === 0) {
            continue;
        }

        // Ties are decided by Earliest Submission
        const winner = await db.collection("userEntries")
            .find({
                competitionId: competition._id,
                status: { $ne: "rejected" },
                voteCount: { $gte: 1 }
            })
            .project({ userId: 1 })
            .sort({ voteCount: -1, submittedAt: 1 })
            .limit(1)
            .next();

        if (!winner) {
            await db.collection("competitions").updateOne(
                { _id: competition._id },
                { $set: { winnerEntryId: null, winnerUserId: null } }
            );
            finalized++;
            continue;
        }

        const winnerUserId = new ObjectId(String(winner.userId));
        const points = Number(competition.pointsReward) || 0;

        // Update Points
        await db.collection("users").updateOne(
            { _id: winnerUserId },
            { $inc: { points: points } }
        );

        // History
        await db.collection("leaderboard").insertOne({
            userId: winnerUserId,
            sourceType: "competition",
            sourceId: competition._id,
            entryId: winner._id,
            points: points,
            description: `Won "${competition.title}"`,
            createdAt: now
        });

        // Winner
        await db.collection("competitions").updateOne(
            { _id: competition._id },
            { $set: { winnerEntryId: winner._id, winnerUserId: winnerUserId } }
        );

        await db.collection("userEntries").updateOne(
            { _id: winner._id },
            { $set: { pointsAwarded: points } }
        );

        finalized++;
    }

    return finalized;
}
