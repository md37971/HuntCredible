import express from "express"
import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';
const router = express.Router();

// POST /api/v1/parties
router.post('/', async (req, res) => {
    try {
        if (!req.session?.user) { //Login Validation
            return res.status(401).json({
                statusCode: 401,
                statusMessage: "Unauthorized",
                content: { message: "You must be logged in to create a party" }
            });
        }

        const { name, description } = req.body ?? {};

        if (!name || !name.trim()) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Party name is required" }
            });
        }

        const userId = req.session.user._id;

        const party = {
            name: name.trim(),
            description: description?.trim() ?? "",
            createdBy: userId,
            members: [
                {
                    userId: userId,
                    joinedAt: new Date(),
                    role: "owner"
                }
            ],
            createdAt: new Date()
        };

        const result = await getDb().collection('parties').insertOne(party);

        return res.status(201).json({
            success: true,
            data: {
                partyId: result.insertedId,
                name: party.name,
                createdBy: userId,
                members: [userId]
            }
        });

    } catch (error) {
        console.error("Error creating party:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to create party" }
        });
    }
});

// GET /api/v1/parties
router.get('/', async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: "Unauthorized",
                content: { message: "You must be logged in to view parties" }
            });
        }

        const userId = req.session.user._id;

        //Searches through the database if the userId creates or is a member of that party group.
        const parties = await getDb()
            .collection('parties')
            .find({ "members.userId": userId })
            .toArray();

        return res.status(200).json({
            success: true,
            data: parties
        });

    } catch (error) {
        console.error("Error retrieving parties:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to retrieve parties" }
        });
    }
});

// GET /api/v1/parties/:partyId
router.get('/:partyId', async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: "Unauthorized",
                content: { message: "You must be logged in" }
            });
        }

        const { partyId } = req.params;
        const userId = req.session.user._id;

        if (!ObjectId.isValid(partyId)) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Invalid party ID" }
            });
        }


        //Simpily fetches the matching ID from the database.
        const party = await getDb().collection('parties').findOne({
            _id: new ObjectId(partyId),
            "members.userId": userId
        });

        if (!party) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "Party not found" }
            });
        }

        return res.status(200).json({
            success: true,
            data: party
        });

    } catch (error) {
        console.error("Error retrieving party:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to retrieve party" }
        });
    }
});

//PATCH /api/v1/parties/:partyId - Updates the selected party.
router.patch('/:partyId', async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: "Unauthorized",
                content: {
                    message: "You must be logged in"
                }
            });
        }

        const { partyId } = req.params;
        const { name, description } = req.body ?? {};
        const userId = req.session.user._id;

        if (!ObjectId.isValid(partyId)) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Invalid party ID" }
            });
        }

        if (name === undefined && description === undefined) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "At least one field must be provided" }
            });
        }

        const updates = {};

        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({
                    statusCode: 400,
                    statusMessage: "Bad Request",
                    content: { message: "Party name cannot be empty" }
                });
            }
            updates.name = name.trim();
        }

        if (description !== undefined) {
            if (typeof description !== 'string') {
                return res.status(400).json({
                    statusCode: 400,
                    statusMessage: "Bad Request",
                    content: { message: "Description must be a string" }
                });
            }
            updates.description = description.trim();
        }

        //Updates the selected party with the new name and description.
        const result = await getDb().collection('parties').updateOne(
            {
                _id: new ObjectId(partyId),
                createdBy: userId
            },
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "Party not found or you are not the owner" }
            });
        }

        return res.status(200).json({
            success: true,
            data: { message: "Party updated successfully" }
        });

    } catch (error) {
        console.error("Error updating party:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to update party" }
        });
    }
});

//DELETE /api/v1/parties/:partyId - Deletes the selected party.
router.delete('/:partyId', async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: "Unauthorized",
                content: {
                    message: "You must be logged in"
                }
            });
        }

        const { partyId } = req.params;
        const userId = req.session.user._id;

        if (!ObjectId.isValid(partyId)) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Invalid party ID" }
            });
        }

        //Deletes the selected party.
        const result = await getDb().collection('parties').deleteOne({
            _id: new ObjectId(partyId),
            createdBy: userId
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "Party not found or you are not the owner" }
            });
        }

        return res.status(200).json({
            success: true,
            data: { message: "Party deleted successfully" }
        });

    } catch (error) {
        console.error("Error deleting party:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to delete party" }
        });
    }
});

//POST /api/parties/:partyId/join - User joins a party.
router.post('/:partyId/join', async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: "Unauthorized",
                content: {
                    message: "You must be logged in"
                }
            });
        }


        const { partyId } = req.params;
        const userId = req.session.user._id;

        if (!ObjectId.isValid(partyId)) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Invalid party ID" }
            });
        }

        //Get the party document and finds the exact party ID.
        const parties = getDb().collection('parties');
        const objectPartyId = new ObjectId(partyId);

        const party = await parties.findOne({
            _id: objectPartyId
        });

        if (!party) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "Party not found" }
            });
        }

        if (party.members.some(member =>
            member.userId.toString() === userId.toString()
        )) {
            return res.status(409).json({
                statusCode: 409,
                statusMessage: "Conflict",
                content: { message: "You are already a member of this party" }
            });
        }

        //Updates the party to add a new member with the userID to join the group.
        await parties.updateOne(
            {
                _id: objectPartyId,
                "members.userId": { $ne: userId }
            },
            {
                $push: {
                    members: {
                        userId: userId,
                        joinedAt: new Date(),
                        role: "member"
                    }
                }
            }
        );

        return res.status(200).json({
            success: true,
            data: { message: "Joined party successfully" }
        });

    } catch (error) {
        console.error("Error joining party:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to join party" }
        });
    }
});

//POST /api/parties/:partyId/leave
router.post('/:partyId/leave', async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: "Unauthorized",
                content: { message: "You must be logged in" }
            });
        }

        const { partyId } = req.params;
        const userId = req.session.user._id;

        if (!ObjectId.isValid(partyId)) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Invalid party ID" }
            });
        }

        //Finds and selects the party from the database.
        const parties = getDb().collection('parties');
        const objectPartyId = new ObjectId(partyId);

        const party = await parties.findOne({
            _id: objectPartyId
        });

        if (!party) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "Party not found" }
            });
        }

        //Finds the member from the collection.
        const membership = party.members.find(member =>
            member.userId.toString() === userId.toString()
        );

        if (!membership) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "You are not a member of this party" }
            });
        }

        if (membership.role === "owner") {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: {
                    message: "The party owner cannot leave. Delete the party or transfer ownership first."
                }
            });
        }

        //Updates the member list so that the member is pulled away from the party (leaving)
        await parties.updateOne(
            { _id: objectPartyId },
            {
                $pull: {
                    members: { userId: userId }
                }
            }
        );

        return res.status(200).json({
            success: true,
            data: { message: "Left party successfully" }
        });

    } catch (error) {
        console.error("Error leaving party:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to leave party" }
        });
    }
});

//GET /api/parties/:partyId/members
router.get('/:partyId/members', async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: "Unauthorized",
                content: { message: "You must be logged in" }
            });
        }

        const { partyId } = req.params;
        const userId = req.session.user._id;

        if (!ObjectId.isValid(partyId)) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Invalid party ID" }
            });
        }

        //Finds the party from the collections to select.
        const party = await getDb().collection('parties').findOne({
            _id: new ObjectId(partyId),
            "members.userId": userId
        });

        if (!party) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "Party not found or you are not a member" }
            });
        }

        //Returns the full list of objectID members.
        return res.status(200).json({
            success: true,
            data: party.members
        });

    } catch (error) {
        console.error("Error retrieving party members:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to retrieve party members" }
        });
    }
});

//DELETE /api/parties/:partyId/members/:userId
router.delete('/:partyId/members/:userId', async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                statusCode: 401,
                statusMessage: "Unauthorized",
                content: { message: "You must be logged in" }
            });
        }

        //Recieves the required parameter requests to remove a member.
        const { partyId, userId: targetUserId } = req.params;
        const ownerId = req.session.user._id;

        if (!ObjectId.isValid(partyId) || !ObjectId.isValid(targetUserId)) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "Invalid party or user ID" }
            });
        }

        if (ownerId.toString() === targetUserId) {
            return res.status(400).json({
                statusCode: 400,
                statusMessage: "Bad Request",
                content: { message: "You cannot remove yourself using this endpoint" }
            });
        }

        //Finds the party group to update the member list to remove a member.
        const parties = getDb().collection('parties');
        const partyObjectId = new ObjectId(partyId);
        const targetObjectId = new ObjectId(targetUserId);

        const party = await parties.findOne({
            _id: partyObjectId,
            createdBy: ownerId.toString()
        });

        if (!party) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "Party not found or you are not the owner" }
            });
        }

        //Pulls the group member out of the party. Formatted like this due to objectID and string mismatch with the data types.
        const result = await parties.updateOne(
            { _id: partyObjectId },
            {
                $pull: {
                    members: {
                        userId: {
                            $in: [
                                targetObjectId,
                                targetUserId
                            ]
                        }
                    }
                }
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({
                statusCode: 404,
                statusMessage: "Not Found",
                content: { message: "User is not a member of this party" }
            });
        }

        return res.status(200).json({
            success: true,
            data: { message: "Member removed successfully" }
        });

    } catch (error) {
        console.error("Error removing party member:", error);

        return res.status(500).json({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            content: { message: "Failed to remove party member" }
        });
    }
});

export default router;