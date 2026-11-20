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
                clientSubmissionId
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
            const existingSubmission = await getDb().collection("competitions").findOne({
                _id: competitionObjectId,
                submissions: {
                    $elemMatch: { userId: userId }
                }
            });

            if (existingSubmission) {
                return res.status(409).json({
                    statusCode: 409,
                    statusMessage: "Conflict",
                    content: { message: "You have already submitted to this competition" }
                });
            }

            // Check for a duplicate submission ID.
            const duplicateSubmission = await getDb().collection("competitions").findOne({
                "submissions.clientSubmissionId": clientSubmissionId.trim()
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
                submissionId: submissionId,
                userId: userId,
                clientSubmissionId: clientSubmissionId.trim(),

                image: new Binary(compressedImage),
                imageType: "image/webp",

                latitude: lat,
                longitude: long,

                capturedAt: captureDate,
                submittedAt: now,

                status: "pending",
                animalDetected: null,
                pointsAwarded: 0
            };

            // Add the submission directly to the competition document.
            // This filter prevents the same user from submitting twice,
            // even if two requests arrive at nearly the same time.
            const result = await getDb().collection("competitions").updateOne(
                {
                    _id: competitionObjectId,
                    submissions: {
                        $not: {
                            $elemMatch: { userId: userId }
                        }
                    }
                },
                {
                    $push: {
                        submissions: submission
                    }
                }
            );

            if (result.modifiedCount === 0) {
                return res.status(409).json({
                    statusCode: 409,
                    statusMessage: "Conflict",
                    content: { message: "You have already submitted to this competition" }
                });
            }

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

        // Retrieve the competition and its submissions.
        const competition = await getDb().collection("competitions").findOne(
            { _id: new ObjectId(competitionId) },
            { projection: { submissions: 1 } }
        );

        if (!competition) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "Competition not found" }
            });
        }

        // Return submissions without the image binary.
        const submissions = (competition.submissions ?? []).map(submission => ({
            submissionId: submission.submissionId,
            userId: submission.userId,
            latitude: submission.latitude,
            longitude: submission.longitude,
            capturedAt: submission.capturedAt,
            submittedAt: submission.submittedAt,
            status: submission.status,
            animalDetected: submission.animalDetected,
            pointsAwarded: submission.pointsAwarded
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

export default router;
