import express from "express";
import { getDb } from "../db.js";
import { ObjectId, Binary } from "mongodb";
import sharp from "sharp";
import upload from "../middleware/uploadMiddleware.js";
const router = express.Router();

// GET /api/v1/competitions - Retrieves all active competitions
router.get("/competitions", async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: "Unauthorized",
                content: { message: "You must be logged in" }
            });
        }
        const now = new Date();

        // Finds competitions that are currently active.
        const competitions = await getDb().collection("competitions")
        .find(
            {
                status: "active",
                startDate: { $lte: now },
                endDate: { $gte: now }
            },
            {
                projection: { submissions: 0 }
            }
        )
        .toArray();

        return res.status(200).json({
            success: true,
            data: competitions
        });

    } catch (error) {
        console.error("Error retrieving competitions:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to retrieve competitions" }
        });
    }
});

// GET /api/v1/competitions/:competitionId - Retrieves a specific competition
router.get("/competitions/:competitionId", async (req, res) => {
    try {
        const { competitionId } = req.params;

        if (!ObjectId.isValid(competitionId)) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Invalid competition ID" }
            });
        }

        // Finds the competitions using its MongoDB ID.
        const competition = await getDb().collection("competitions").findOne(
            { _id: new ObjectId(competitionId) },
            { projection: { submissions: 0 } }
        );

        if (!competition) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "Competition not found" }
            });
        }

        return res.status(200).json({
            success: true,
            data: competition
        });

    } catch (error) {
        console.error("Error retrieving competition:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to retrieve competition" }
        });
    }
});

// POST /api/v1/competitions/:competitionId/submit - Submits a competitions photo
router.post("/competitions/:competitionId/submit", (req, res, next) => {
    if (!req.session?.user) {
        return res.status(401).json({
            statusCode: 401,
            statusMessage: "Unauthorized",
            content: { message: "You must be logged in to submit a competition entry" }
        });
    }
    next();
},
    upload.single("image"),
    async (req, res) => {
        try {
            const { competitionId } = req.params;

            const {
                latitude,
                longitude,
                capturedAt,
                clientSubmissionId,
                caption
            } = req.body ?? {};

            // Validate IDs before creating ObjectIds.
            if (
                !ObjectId.isValid(competitionId) ||
                !ObjectId.isValid(req.session.user._id)
            ) {
                return res.status(400).json({
                    statusCode: 400,
                    statusMessage: "Bad Request",
                    content: { message: "Invalid competition or user ID" }
                });
            }

            const userId = new ObjectId(req.session.user._id);
            const competitionObjectId = new ObjectId(competitionId);

            // Make sure an image was uploaded.
            if (!req.file) {
                return res.status(400).json({
                    statusCode: 400,
                    statusMessage: "Bad Request",
                    content: { message: "A competition photo is required" }
                });
            }

            // Validate latitude and longitude.
            const lat = Number(latitude);
            const long = Number(longitude);

            if (
                latitude === undefined ||
                longitude === undefined ||
                !Number.isFinite(lat) ||
                !Number.isFinite(long) ||
                lat < -90 ||
                lat > 90 ||
                long < -180 ||
                long > 180
            ) {
                return res.status(400).json({
                    statusCode: 400,
                    statusMessage: "Bad Request",
                    content: { message: "Valid latitude and longitude are required" }
                });
            }

            // Validate capture date.
            const captureDate = new Date(capturedAt);

            if (
                typeof capturedAt !== "string" ||
                !Number.isFinite(captureDate.getTime())
            ) {
                return res.status(400).json({
                    statusCode: 400,
                    statusMessage: "Bad Request",
                    content: { message: "A valid capturedAt date is required" }
                });
            }

            // Validate client submission ID.
            if (
                typeof clientSubmissionId !== "string" ||
                !clientSubmissionId.trim()
            ) {
                return res.status(400).json({
                    statusCode: 400,
                    statusMessage: "Bad Request",
                    content: { message: "A clientSubmissionId is required" }
                });
            }

            if (
                caption !== undefined &&
                (typeof caption !== "string" || caption.trim().length > 200)
            ) {
                return res.status(400).json({
                    statusCode: 400,
                    statusMessage: "Bad Request",
                    content: { message: "Caption must be 200 characters or fewer" }
                });
            }


            const now = new Date();

            if (captureDate > now) {
                return res.status(400).json({
                    statusCode: 400,
                    statusMessage: "Bad Request",
                    content: { message: "Capture date cannot be in the future" }
                });
            }

            // Find the competition.
            const competition = await getDb().collection("competitions").findOne({
                _id: competitionObjectId
            });

            if (!competition) {
                return res.status(404).json({
                    statusCode: 404,
                    statusMessage: "Not Found",
                    content: { message: "Competition not found" }
                });
            }

            // Check whether the competition is active.
            if (
                competition.status !== "active" ||
                new Date(competition.startDate) > now ||
                new Date(competition.endDate) < now
            ) {
                return res.status(400).json({
                    statusCode: 400,
                    statusMessage: "Bad Request",
                    content: { message: "This competition is not currently active" }
                });
            }

            // Make sure the photo was captured during the competition.
            if (
                captureDate < new Date(competition.startDate) ||
                captureDate > new Date(competition.endDate)
            ) {
                return res.status(400).json({
                    statusCode: 400,
                    statusMessage: "Bad Request",
                    content: { message: "Photo must be captured during the competition" }
                });
            }

            // Check whether this user already submitted to this competition.
            const existingSubmission = await getDb().collection("userEntries").findOne({
                competitionId: competitionObjectId,
                userId: userId
            });

            if (existingSubmission) {
                return res.status(409).json({
                    statusCode: 409,
                    statusMessage: "Conflict",
                    content: { message: "You have already submitted to this competition" }
                });
            }

            // Check for a duplicate submission ID.
            const duplicateSubmission = await getDb().collection("userEntries").findOne({
                clientSubmissionId: clientSubmissionId.trim()
            }); 

            if (duplicateSubmission) {
                return res.status(409).json({
                    statusCode: 409,
                    statusMessage: "Conflict",
                    content: { message: "This submission has already been uploaded" }
                });
            }

            // Compress and resize the image using Sharp.
            const compressedImage = await sharp(req.file.buffer)
                .rotate()
                .resize({
                    width: 1200,
                    height: 1200,
                    fit: "inside",
                    withoutEnlargement: true
                })
                .webp({ quality: 70 })
                .toBuffer();

            // Limit the compressed image to 2 MB.
            if (compressedImage.length > 2 * 1024 * 1024) {
                return res.status(400).json({
                    statusCode: 400,
                    statusMessage: "Bad Request",
                    content: { message: "Compressed image must be smaller than 2 MB" }
                });
            }

            // Create submission ID.
            const submissionId = new ObjectId();

            // Create submission object.
            const submission = {
                _id: submissionId,
                competitionId: competitionObjectId,
                userId: userId,
                clientSubmissionId: clientSubmissionId.trim(),
                caption: typeof caption === "string" ? caption.trim(): "",

                image: new Binary(compressedImage),
                imageType: "image/webp",

                latitude: lat,
                longitude: long,

                capturedAt: captureDate,
                submittedAt: now,

                status: "pending",
                animalDetected: null,
                pointsAwarded: 0,
                
                voteCount: 0,
                reports: []
            };

            // Insert submission into userEntries collection
            await getDb().collection("userEntries").insertOne(submission);

            return res.status(201).json({
                success: true,
                data: {
                    submissionId: submissionId.toString(),
                    competitionId: competitionId,
                    status: "pending",
                    animalDetected: null,
                    pointsAwarded: 0
                }
            });

        } catch (error) {
            console.error("Error submitting competition:", error);

            return res.status(500).json({
                statusCode: 500,
                statusMessage: "Internal Server Error",
                content: { message: "Failed to submit competition" }
            });
        }
    }
);

// GET /api/v1/competitions/:competitionId/submissions - Retrieves competition submissions
router.get("/competitions/:competitionId/submissions", async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: "Unauthorized",
                content: { message: "You must be logged in" }
            });
        }

        const { competitionId } = req.params;

        if (!ObjectId.isValid(competitionId)) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Invalid competition ID" }
            });
        }

        const competitionObjectId = new ObjectId(competitionId);

        // Make sure the competition exists.
        const competition = await getDb().collection("competitions").findOne({
            _id: competitionObjectId
        });

        if (!competition) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "Competition not found" }
            });
        }



        const entries = await getDb().collection("userEntries")
            .find({ competitionId: competitionObjectId })
            .project({ latitude: 0, longitude: 0, clientSubmissionId: 0 })
            .toArray();

        const userIds = [...new Set(entries.map((entry) => String(entry.userId)))]
            .filter((id) => ObjectId.isValid(id))
            .map((id) => new ObjectId(id));

        const users = await getDb().collection("users")
            .find({ _id: { $in: userIds } })
            .project({ firstName: 1, lastName: 1 })
            .toArray();

        const usersById = new Map(users.map((user) => [String(user._id), user]));
        const userId = String(req.session.user._id);


        // Retrieve submissions from userEntries.
        // Exclude image binary data from the response.

        //// Changed the response to include image as well. Ryan ////
        const submissions = entries.map(({ image, imageType, voters, reports, reportCount, ...entry }) => ({
            ...entry,
            user: usersById.get(String(entry.userId)) ?? null,
            voteCount: entry.voteCount ?? 0,
            userVoted: (voters ?? []).some((id)=> String(id) === userId),
            userReported: (reports ?? []).some((report) => String(report.userId) === userId),
            imageUrl: image
                ? `data:${imageType || "image/webp"};base64,${image.toString("base64")}`
                : null
        }));

        return res.status(200).json({
            success: true,
            data: submissions
        });

    } catch (error) {
        console.error("Error retrieving competition submissions:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to retrieve competition submissions" }
        });
    }
});

// DELETE /api/v1/competitions/:competitionId/submissions/:submissionId - Deletes a competition submission (Admin only)
router.delete("/competitions/:competitionId/submissions/:submissionId", (req, res, next) => {
    // Check if user is logged in.
    if (!req.session?.user) {
        return res.status(401).json({
            statusCode: 401,
            statusMessage: "Unauthorized",
            content: { message: "You must be logged in" }
        });
    }

    // Check if user is an admin.
    if (req.session.user.role !== "admin") {
        return res.status(403).json({
            statusCode: 403,
            statusMessage: "Forbidden",
            content: { message: "You do not have permission to delete competition submissions" }
        });
    }

    next();
},
    async (req, res) => {
        try {
            const { competitionId, submissionId } = req.params;

            // Validate IDs.
            if (
                !ObjectId.isValid(competitionId) ||
                !ObjectId.isValid(submissionId)
            ) {
                return res.status(400).json({
                    statusCode: 400,
                    statusMessage: "Bad Request",
                    content: { message: "Invalid competition or submission ID" }
                });
            }

            const competitionObjectId = new ObjectId(competitionId);
            const submissionObjectId = new ObjectId(submissionId);

            // Find and delete the submission.
            const result = await getDb().collection("userEntries").deleteOne({
                _id: submissionObjectId,
                competitionId: competitionObjectId
            });

            // Check if submission exists.
            if (result.deletedCount === 0) {
                return res.status(404).json({
                    statusCode: 404,
                    statusMessage: "Not Found",
                    content: { message: "Competition submission not found" }
                });
            }

            return res.status(200).json({
                success: true,
                content: { message: "Competition submission deleted successfully" }
            });

        } catch (error) {
            console.error("Error deleting competition submission:", error);

            return res.status(500).json({
                statusCode: 500,
                statusMessage: "Internal Server Error",
                content: { message: "Failed to delete competition submission" }
            });
        }
    }
);

// PATCH /api/v1/submissions/:submissionId/vote - Adds or removes the logged-in user's vote on an entry
router.patch("/submissions/:submissionId/vote", async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: "Unauthorized",
                content: { message: "You must be logged in to vote" }
            });
        }

        const { submissionId } = req.params;
        const { vote } = req.body ?? {};

        if (
            !ObjectId.isValid(submissionId) ||
            !ObjectId.isValid(req.session.user._id)
        ) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Invalid submission or user ID" }
            });
        }

        if (typeof vote !== "boolean") {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "vote must be true or false" }
            });
        }

        const userId = new ObjectId(req.session.user._id);
        const submissionObjectId = new ObjectId(submissionId);

        // Find the entry being voted on.
        const submission = await getDb().collection("userEntries").findOne(
            { _id: submissionObjectId },
            { projection: { image: 0 } }
        );

        if (!submission) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "Submission not found" }
            });
        }

        // Users can't vote for their own entry.
        if (String(submission.userId) === String(userId)) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "You can't vote for your own entry" }
            });
        }

        // Voting closes when the competition ends.
        const competition = await getDb().collection("competitions").findOne(
            { _id: submission.competitionId },
            { projection: { status: 1, startDate: 1, endDate: 1 } }
        );

        const now = new Date();

        if (
            !competition ||
            competition.status !== "active" ||
            new Date(competition.startDate) > now ||
            new Date(competition.endDate) < now
        ) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Voting is closed for this competition" }
            });
        }

        // Track who has already voted for an entry
        if (vote) {
            await getDb().collection("userEntries").updateOne(
                { _id: submissionObjectId, voters: { $ne: userId } },
                { $addToSet: { voters: userId }, $inc: { voteCount: 1 } }
            );
        } else {
            await getDb().collection("userEntries").updateOne(
                { _id: submissionObjectId, voters: userId },
                { $pull: { voters: userId }, $inc: { voteCount: -1 } }
            );
        }

        const updated = await getDb().collection("userEntries").findOne(
            { _id: submissionObjectId },
            { projection: { voteCount: 1, voters: 1 } }
        );

        return res.status(200).json({
            success: true,
            data: {
                submissionId: submissionId,
                voteCount: updated.voteCount ?? 0,
                userVoted: (updated.voters ?? []).some((id) => String(id) === String(userId))
            }
        });

    } catch (error) {
        console.error("Error updating vote:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to update vote" }
        });
    }
});

// POST /api/v1/submissions/:submissionId/report - Reports an entry
router.post("/submissions/:submissionId/report", async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: "Unauthorized",
                content: { message: "You must be logged in to report an entry" }
            });
        }

        const { submissionId } = req.params;
        const { reason } = req.body ?? {};

        if (
            !ObjectId.isValid(submissionId) ||
            !ObjectId.isValid(req.session.user._id)
        ) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Invalid submission or user ID" }
            });
        }

        if (
            typeof reason !== "string" ||
            reason.trim().length < 3 ||
            reason.trim().length > 300
        ) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Please give a reason (3 to 300 characters)" }
            });
        }

        const userId = new ObjectId(req.session.user._id);
        const submissionObjectId = new ObjectId(submissionId);

        // Find the entry being reported.
        const submission = await getDb().collection("userEntries").findOne(
            { _id: submissionObjectId },
            { projection: { userId: 1, reports: 1 } }
        );

        if (!submission) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "Submission not found" }
            });
        }

        // Users can't report their own entry.
        if (String(submission.userId) === String(userId)) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "You can't report your own entry" }
            });
        }

        // Can't report twice
        const result = await getDb().collection("userEntries").updateOne(
            { _id: submissionObjectId, "reports.userId": { $ne: userId } },
            {
                $push: {
                    reports: {
                        userId: userId,
                        reason: reason.trim(),
                        createdAt: new Date()
                    }
                },
                $inc: { reportCount: 1 }
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(409).json({
                statusCode: 409,
                statusMessage: "Conflict",
                content: { message: "You already reported this entry" }
            });
        }

        return res.status(201).json({
            success: true,
            data: {
                submissionId: submissionId,
                userReported: true
            }
        });

    } catch (error) {
        console.error("Error reporting submission:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to report submission" }
        });
    }
});

export default router;
