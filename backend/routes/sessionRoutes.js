import express from "express";
import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
const router = express.Router();


//POST  parties/:partyId/sessions - Begins an active session inside the party (Everyone in the group participates)
router.post('/parties/:partyId/sessions', async (req, res) => {
    try {
        if (!req.session?.user) { //Checks user log in.
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Please log in.'
            });
        }

        //Identify userID and party information
        const userId = req.session.user._id;
        const { partyId } = req.params;

        if (!ObjectId.isValid(partyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid party ID.'
            });
        }

        const db = getDb();

        //Searches the party ID.
        const party = await db.collection('parties').findOne({
            _id: new ObjectId(partyId)
        });

        if (!party) {
            return res.status(404).json({
                success: false,
                message: 'Party not found.'
            });
        }


        //Checking to see if the member is in the party.
        const isMember = party.members?.some(member =>
            member.userId?.toString() === userId.toString()
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: 'You must be a member of this party to start a hunting session.'
            });
        }

        //Checking to see if there is an active party session and reject duplicate sessions.
        const existingSession = await db.collection('sessions').findOne({
            partyId: partyId,
            status: 'active'
        });

        if (existingSession) {
            return res.status(409).json({
                success: false,
                message: 'This party already has an active hunting session.',
                data: existingSession
            });
        }

        //Create the hunting session with these documents.
        const newSession = {
            partyId: partyId,
            startedBy: userId.toString(),
            status: 'active',
            startedAt: new Date(),
            endedAt: null,
            participants: party.members.map(member =>
                member.userId.toString()
            )
        };

        //Save session to MongoDB
        const result = await db.collection('sessions').insertOne(newSession);

        //Returns the data of the created session.
        const createdSession = {
            _id: result.insertedId,
            ...newSession
        };

        return res.status(201).json({
            success: true,
            message: 'Hunting session started successfully.',
            data: createdSession
        });


    } catch (error) {
        console.error('Error starting hunting session:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

//GET  parties/:partyId/sessions/active - Gets a session that's currently active.
router.get('/parties/:partyId/sessions/active', async (req, res) => {
    try {

        if (!req.session?.user) { //Checks user log in.
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Please log in.'
            });
        }

        const userId = req.session.user._id;
        const { partyId } = req.params;
        const db = getDb();

        //Searches the party ID.
        const party = await db.collection('parties').findOne({
            _id: new ObjectId(partyId)
        });

        if (!party) {
            return res.status(404).json({
                success: false,
                message: 'Party not found.'
            });
        }


        //Checking to see if the member is in the party.
        const isMember = party.members?.some(member =>
            member.userId?.toString() === userId.toString()
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: 'You must be a member of this party to start a hunting session.'
            });
        }

        const activeSession = await db.collection('sessions').findOne({
            partyId: partyId,
            status: 'active'
        });

        if (!activeSession) {
            return res.status(404).json({
                sucess: false,
                message: "No active hunting sessions found for this party."
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Active hunting session retrieved successfully',
            data: activeSession
        })


    } catch (error) {
        console.error('Error retrieving active hunting session:', error);

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

//GET parties/:partyId/sessions/:sessionId - Gets the session by its ID.
router.get('/parties/:partyId/sessions/:sessionId', async (req, res) => {
    try {
        if (!req.session?.user) { //Checks user log in.
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Please log in.'
            });
        }

        const userId = req.session.user._id;
        const { sessionId } = req.params;
        const { partyId } = req.params;
        const db = getDb();

        //Getting the session from the active session.
        const session = await db.collection('sessions').findOne({
            _id: new ObjectId(sessionId)
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Hunting session not found.'
            });
        }


        //Searches the party ID.
        const party = await db.collection('parties').findOne({
            _id: new ObjectId(partyId)
        });

        if (!party) {
            return res.status(404).json({
                success: false,
                message: 'Party not found.'
            });
        }


        //Checking to see if the member is in the party.
        const isMember = party.members?.some(member =>
            member.userId?.toString() === userId.toString()
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: 'You must be a member of this party to start a hunting session.'
            });
        }

        return res.status(200).json({
            success: true,
            message: "Hunting session retrieved successsfully",
            data: session
        });


    } catch (error) {
        console.error('Error retrieving hunting session:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

//POST sessions/:sessionId/end - Ends current session.
router.post('/sessions/:sessionId/end', async (req, res) => {
    try {
        if (!req.session?.user) { //Checks user log in.
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Please log in.'
            });
        }

        const { sessionId } = req.params;
        const userId = req.session.user._id;
        const db = getDb()

        if (!ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Session ID."
            })
        }

        //Finding the session from the database.
        const session = await db.collection('sessions').findOne({
            _id: new ObjectId(sessionId)
        });

        if (!session) {
            return res.status(400).json({
                success: false,
                message: "Hunting session not found."
            })
        }


        //Check if the session is not active,
        if (session.status !== 'active') {
            return res.status(409).json({
                success: false,
                message: 'This hunting session has already ended.'
            });
        }

        //Update the session to end it
        const result = await db.collection('sessions').updateOne(
            { _id: new ObjectId(sessionId) },
            {
                $set: {
                    status: 'ended',
                    endedAt: new Date()
                }
            }
        );

        //Returning the updated session from the database.
        const updatedSession = await db.collection('sessions').findOne({
            _id: new ObjectId(sessionId)
        });

        return res.status(200).json({
            success: true,
            message: "Hunting session successfully ended.",
            data: updatedSession
        });

    } catch (error) {
        console.error('Error retrieving hunting session: ', error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

//GET sessions/:sessionId/locations - Retrieve locations from all participiants in the session.
router.get('/sessions/:sessionId/locations', async (req, res) => {
    try {

        if (!req.session?.user) { //Checks user log in.
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Please log in.'
            });
        }

        const { sessionId } = req.params;
        const userId = req.session.user._id;
        const db = getDb()

        if (!ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Session ID."
            })
        }

        //Finding the session from the database.
        const session = await db.collection('sessions').findOne({
            _id: new ObjectId(sessionId)
        });

        if (!session) {
            return res.status(400).json({
                success: false,
                message: "Hunting session not found."
            })
        }

        //Checks if the member is in that party.
        const party = await db.collection('parties').findOne({
            _id: new ObjectId(session.partyId)
        });

        if (!party) {
            return res.status(404).json({
                success: false,
                message: 'Party associated with this session was not found.'
            });
        }

        //Checks membership inside the party.
        const isMember = party.members?.some(member =>
            member.userId?.toString() === userId.toString()
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: 'You must be a member of this party.'
            });
        }


        //Retrieving locations of the participants.
        const locations = await db.collection('locations').find({
            sessionId: sessionId
        }).toArray();

        return res.status(200).json({
            success: true,
            message: "Sessions locations retrieved successfully.",
            data: locations
        });

    } catch (error) {
        console.error('Error retrieving hunting session:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PUT /sessions/:sessionId/locations - Updates the location of participants.
/*
EXAMPLE JSON PAYLOAD

{
    "latitude": 35.3859,
    "longitude": -94.3985
}
*/
router.put('/sessions/:sessionId/locations', async (req, res) => {
    try {
        if (!req.session?.user) { //Checks user log in.
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Please log in.'
            });
        }

        const { sessionId } = req.params;
        const userId = req.session.user._id;
        const db = getDb()

        if (!ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Session ID."
            })
        }

        //Finding the session from the database.
        const session = await db.collection('sessions').findOne({
            _id: new ObjectId(sessionId)
        });

        if (!session) {
            return res.status(400).json({
                success: false,
                message: "Hunting session not found."
            })
        }


        //Checks if the member is in that party.
        const party = await db.collection('parties').findOne({
            _id: new ObjectId(session.partyId)
        });

        if (!party) {
            return res.status(404).json({
                success: false,
                message: 'Party associated with this session was not found.'
            });
        }

        //Checks membership inside the party.
        const isMember = party.members?.some(member =>
            member.userId?.toString() === userId.toString()
        );

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: 'You must be a member of this party.'
            });
        }

        //Checks if the session is active or not.
        if (session.status !== 'active') {
            return res.status(409).json({
                success: false,
                message: 'Cannot update location because this hunting session has ended.'
            });
        }

        //Validation of longitude and latitude.
        const { latitude, longitude } = req.body;

        if (
            typeof latitude !== 'number' ||
            typeof longitude !== 'number' ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid latitude or longitude.'
            });
        }

        //Saving and updating the user's location.
        const result = await db.collection('locations').updateOne(
            {
                sessionId: sessionId,
                userId: userId.toString()
            },
            {
                $set: {
                    partyId: session.partyId,
                    latitude: latitude,
                    longitude: longitude,
                    lastUpdated: new Date(),
                    isConnected: true
                }
            },
            { upsert: true }
        );

        const updatedLocation = await db.collection('locations').findOne({
            sessionId: sessionId,
            userId: userId.toString()
        });


        return res.status(200).json({
            success: true,
            message: "Location successfully updated",
            data: updatedLocation
        });


    } catch (error) {
        console.error('Error retrieving hunting session:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

//GET /sessions/:sessionId/members/:userId/locations - Request's the user's and then determine that target's users last known location. 
router.get('/sessions/:sessionId/members/:userId/locations', async (req, res) => {
    try {
        if (!req.session?.user) { //Checks user log in.
            return res.status(401).json({
                success: false,
                message: 'Unauthorized. Please log in.'
            });
        }

        const { sessionId, userId: targetUserId } = req.params;
        const requesterId = req.session.user._id;

        if ((!ObjectId.isValid(sessionId)) || (!ObjectId.isValid(targetUserId))) {
            return res.status(400).json({
                success: false,
                message: "Invalid Session ID or user ID."
            })
        }

        //Finding the session from the database.
        const db = getDb();
        const session = await db.collection('sessions').findOne({
            _id: new ObjectId(sessionId)
        });

        if (!session) {
            return res.status(400).json({
                success: false,
                message: "Hunting session not found."
            })
        }

        //Gets the party from the collections.
        const party = await db.collection('parties').findOne({
            _id: new ObjectId(session.partyId)
        });

        if (!party) {
            return res.status(404).json({
                success: false,
                message: 'Party associated with this session was not found.'
            });
        }

        //Checking if the requested member is a member of that party.
        const isRequesterMember = party.members?.some(member =>
            member.userId?.toString() === requesterId.toString()
        );

        if (!isRequesterMember) {
            return res.status(403).json({
                success: false,
                message: 'You must be a party member to view locations.'
            });
        }

        //Checking if the target member is a member of that party.
        const isTargetMember = party.members?.some(member =>
            member.userId?.toString() === targetUserId.toString()
        );

        if (!isTargetMember) {
            return res.status(404).json({
                success: false,
                message: 'Target user is not a member of this party.'
            });
        }

        //Retrieve the target user's last known location.
        const location = await db.collection('locations').findOne({
            sessionId: sessionId,
            userId: targetUserId.toString()
        });

        if (!location) {
            return res.status(404).json({
                success: false,
                message: 'No location found for this user in this session.'
            });
        }

        return res.status(200).json({
            success: true,
            message: "Member location retrieved successfully.",
            data: location
        });


    } catch (error) {
        console.error('Error retrieving hunting session:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

export default router;