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

//POST /api/parties/:partyId/leave - Member of party leaves.
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

//GET /api/parties/:partyId/members - Gets the list of members inside of a party.
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

//DELETE /api/parties/:partyId/members/:userId - Removes members from a party if you're the owner.
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



//PINS


//POST /parties/:partyId/pins - Create a shared pin
router.post("/:partyId/pins", async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
                content: { message: "You must be logged in" }
            });
        }

        const { partyId } = req.params;
        const { sessionId, description, latitude, longitude } = req.body;
        const userId = req.session.user._id;

        // Validate IDs
        if (!ObjectId.isValid(partyId) || !ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid party or session ID",
                content: { message: "Party or session ID is invalid" }
            });
        }

        // Validate pin information
        if (
            typeof description !== "string" ||
            !description.trim() ||
            typeof latitude !== "number" ||
            typeof longitude !== "number" ||
            latitude < -90 || latitude > 90 ||
            longitude < -180 || longitude > 180
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid pin information",
                content: { message: "Pin information is invalid" }
            });
        }

        // Find party
        const party = await getDb().collection("parties").findOne({
            _id: new ObjectId(partyId)
        });

        if (!party) {
            return res.status(404).json({
                success: false,
                message: "Party not found",
                content: { message: "Party not found" }
            });
        }

        // Check if user is a party member
        const isMember = party.members.some(member =>
            member.userId.toString() === userId.toString()
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this party",
                content: { message: "You are not a member of this party" }
            });
        }

        // Make sure session belongs to this party
        const session = await getDb().collection("huntingSessions").findOne({
            _id: new ObjectId(sessionId),
            partyId: new ObjectId(partyId)
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Hunting session not found",
                content: { message: "Hunting session not found" }
            });
        }

        // Create pin
        const pin = {
            partyId: new ObjectId(partyId),
            sessionId: new ObjectId(sessionId),
            createdBy: userId,
            description: description.trim(),
            latitude,
            longitude,
            createdAt: new Date()
        };

        const result = await getDb().collection("pins").insertOne(pin);

        res.status(201).json({
            success: true,
            data: {
                pinId: result.insertedId.toString(),
                partyId: partyId,
                createdBy: userId.toString(),
                description: pin.description,
                latitude: pin.latitude,
                longitude: pin.longitude,
                createdAt: pin.createdAt
            }
        });

    } catch (error) {
        console.error("Error creating pin:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
            content: { message: "An error occurred while creating the pin" }
        });
    }
});

//GET /parties/:partyId/pins - Retrieve all party pins
router.get("/:partyId/pins", async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
                content: { message: "You must be logged in" }
            });
        }

        const { partyId } = req.params;
        const userId = req.session.user._id;

        if (!ObjectId.isValid(partyId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid party ID",
                content: { message: "Invalid party ID" }
            });
        }

        const db = getDb();

        // Find party
        const party = await db.collection("parties").findOne({
            _id: new ObjectId(partyId)
        });

        if (!party) {
            return res.status(404).json({
                success: false,
                message: "Party not found",
                content: { message: "Party not found" }
            });
        }

        // Check membership
        const isMember = party.members.some(member =>
            member.userId.toString() === userId.toString()
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this party",
                content: { message: "You are not a member of this party" } 
            });
        }

        // Retrieve all party pins
        const pins = await getDb().collection("pins")
            .find({ partyId: new ObjectId(partyId) })
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json({
            success: true,
            data: pins
        });

    } catch (error) {
        console.error("Error retrieving pins:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
            content: { message: "An error occurred while retrieving the pins" }
        });
    }
});

//GET /pins/:pinId - Retrieve a specific pin
router.get("/:partyId/pins/:pinId", async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
                content: { message: "You must be logged in" }
            });
        }

        const { partyId, pinId } = req.params;
        const userId = req.session.user._id;

        if (!ObjectId.isValid(partyId) || !ObjectId.isValid(pinId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid party or pin ID",
                content: { message: "Invalid party or pin ID" } 
            });
        }


        // Find party
        const party = await getDb().collection("parties").findOne({
            _id: new ObjectId(partyId)
        });

        if (!party) {
            return res.status(404).json({
                success: false,
                message: "Party not found",
                content: { message: "Party not found" }
            });
        }

        // Check membership
        const isMember = party.members.some(member =>
            member.userId.toString() === userId.toString()
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this party",
                content: { message: "You are not a member of this party" }
            });
        }

        // Find pin belonging to this party
        const pin = await getDb().collection("pins").findOne({
            _id: new ObjectId(pinId),
            partyId: new ObjectId(partyId)
        });

        if (!pin) {
            return res.status(404).json({
                success: false,
                message: "Pin not found",
                content: { message: "Pin not found" }
            });
        }

        res.status(200).json({
            success: true,
            data: pin
        });

    } catch (error) {
        console.error("Error retrieving pin:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
            content: { message: "An error occurred while retrieving the pin" }
        });
    }
});

//PATCH /pins/:pinId - Update pin description
router.patch("/:partyId/pins/:pinId", async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
                content: { message: "You are not logged in" }
            });
        }

        const { partyId, pinId } = req.params;
        const { description } = req.body;
        const user = req.session.user;
        const userId = user._id;

        if (!ObjectId.isValid(partyId) || !ObjectId.isValid(pinId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid party or pin ID",
                content: { message: "Invalid party or pin ID" }
            });
        }

        if (typeof description !== "string" || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: "Description is required",
                content: { message: "Description is required" }
            });
        }

        // Find party
        const party = await getDb().collection("parties").findOne({
            _id: new ObjectId(partyId)
        });

        if (!party) {
            return res.status(404).json({
                success: false,
                message: "Party not found",
                content: { message: "Party not found" }
            });
        }

        // Find pin
        const pin = await getDb().collection("pins").findOne({
            _id: new ObjectId(pinId),
            partyId: new ObjectId(partyId)
        });

        if (!pin) {
            return res.status(404).json({
                success: false,
                message: "Pin not found",
                content: { message: "Pin not found" }
            });
        }

        // Check permissions
        const membership = party.members.find(member =>
            member.userId.toString() === userId.toString()
        );

        const isOwner = membership?.role === "owner";
        const isCreator = pin.createdBy.toString() === userId.toString();
        const isAdmin = user.role === "admin";

        if (!isOwner && !isCreator && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to edit this pin",
                content: { message: "You do not have permission to edit this pin" }
            });
        }

        // Update pin
        await getDb().collection("pins").updateOne(
            { _id: new ObjectId(pinId), partyId: new ObjectId(partyId) },
            {
                $set: {
                    description: description.trim(),
                    updatedAt: new Date()
                }
            }
        );

        res.status(200).json({
            success: true,
            message: "Pin updated successfully"
        });

    } catch (error) {
        console.error("Error updating pin:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
            content: { message: "Server error" }
        });
    }
});


//DELETE /pins/:pinId - Delete a pin
router.delete("/:partyId/pins/:pinId", async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
                content: { message: "You are not logged in" }
            });
        }

        const { partyId, pinId } = req.params;
        const user = req.session.user;
        const userId = user._id;

        if (!ObjectId.isValid(partyId) || !ObjectId.isValid(pinId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid party or pin ID",
                content: { message: "Invalid party or pin ID" }
            });
        }

        const db = getDb();

        // Find party
        const party = await db.collection("parties").findOne({
            _id: new ObjectId(partyId)
        });

        if (!party) {
            return res.status(404).json({
                success: false,
                message: "Party not found",
                content: { message: "Party not found" } 
            });
        }

        // Find pin
        const pin = await db.collection("pins").findOne({
            _id: new ObjectId(pinId),
            partyId: new ObjectId(partyId)
        });

        if (!pin) {
            return res.status(404).json({
                success: false,
                message: "Pin not found",
                content: { message: "Pin not found" }
            });
        }

        // Check permissions
        const membership = party.members.find(member =>
            member.userId.toString() === userId.toString()
        );

        const isOwner = membership?.role === "owner";
        const isCreator = pin.createdBy.toString() === userId.toString();
        const isAdmin = user.role === "admin";

        if (!isOwner && !isCreator && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to delete this pin",
                content: { message: "You do not have permission to delete this pin" }
            });
        }

        // Delete pin
        await db.collection("pins").deleteOne({
            _id: new ObjectId(pinId),
            partyId: new ObjectId(partyId)
        });

        res.status(200).json({
            success: true,
            message: "Pin deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting pin:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
            content: { message: "Server error" }
        });
    }
});



//MESSAGING


//GET /parties/:partyId/messages
router.get("/:partyId/messages", async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
                content: { message: "You must be logged in" }
            });
        }

        const { partyId } = req.params;
        const userId = req.session.user._id;

        // Validate party ID
        if (!ObjectId.isValid(partyId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid party ID",
                content: { message: "Invalid party ID" }    
            });
        }

        // Find party
        const party = await getDb().collection("parties").findOne({
            _id: new ObjectId(partyId)
        });

        if (!party) {
            return res.status(404).json({
                success: false,
                message: "Party not found",
                content: { message: "Party not found" }
            });
        }

        // Check if user is a party member
        const isMember = party.members.some(member =>
            member.userId.toString() === userId.toString()
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this party",
                content: { message: "You are not a member of this party" }  
            });
        }

        // Retrieve party messages
        const messages = await getDb().collection("messages")
            .find({
                partyId: new ObjectId(partyId)
            })
            .sort({ createdAt: 1 })
            .toArray();

        res.status(200).json({
            success: true,
            data: messages
        });

    } catch (error) {
        console.error("Error retrieving messages:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
            content: { message: "Server error" }    
        });
    }
});

//POST /parties/:partyId/messages
router.post("/:partyId/messages", async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
                content: { message: "You must be logged in" }
            });
        }

        const { partyId } = req.params;
        const { content } = req.body;
        const userId = req.session.user._id;

        // Validate party ID
        if (!ObjectId.isValid(partyId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid party ID",
                content: { message: "Invalid party ID" }    
            });
        }

        // Validate message content
        if (
            typeof content !== "string" ||
            !content.trim() ||
            content.trim().length > 2000
        ) {
            return res.status(400).json({
                success: false,
                message: "Message must contain between 1 and 2000 characters",
                content: { message: "Message must contain between 1 and 2000 characters" }
            });
        }

        // Find party
        const party = await getDb().collection("parties").findOne({
            _id: new ObjectId(partyId)
        });

        if (!party) {
            return res.status(404).json({
                success: false,
                message: "Party not found",
                content: { message: "Party not found" }
            });
        }

        // Check if user is a party member
        const isMember = party.members.some(member =>
            member.userId.toString() === userId.toString()
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this party",
                content: { message: "You are not a member of this party" }
            });
        }

        // Create message
        const message = {
            partyId: new ObjectId(partyId),
            senderId: userId,
            content: content.trim(),
            createdAt: new Date()
        };

        const result = await getDb().collection("messages").insertOne(message);

        // Return created message
        res.status(201).json({
            success: true,
            data: {
                messageId: result.insertedId.toString(),
                partyId: partyId,
                senderId: userId.toString(),
                content: message.content,
                createdAt: message.createdAt
            }
        });

    } catch (error) {
        console.error("Error sending message:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
            content: { message: "Server error" }
        });
    }
});

export default router;