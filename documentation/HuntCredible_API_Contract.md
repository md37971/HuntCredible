# HuntCredible — API Contract
**Version:** 1.0 (Proposed)  
**API Base URL:** `/api/v1`  
**Backend:** Node.js + Express  
**Database:** MongoDB  
**Frontend:** React + Vite  
**Offline Storage:** IndexedDB  
**AI/ML Service:** Python + FastAPI + YOLO  
**Maps:** Leaflet  
**Deployment:** Docker + Render

---

# 1. System Architecture

## 1.1 Application flow

The application will use the following communication structure:

```text
                  React + Vite
                       |
                       |
                Express Backend
                       |
          +------------+-------------+
          |            |             |
       MongoDB      FastAPI        React
       (Cloud)      (Python)       (Real-time)
          |            |             |
       Users,       YOLO Model     Chat, GPS,
       Parties,     Animal        Notifications
       Challenges   Recognition
       etc.

       React Frontend
             |
          IndexedDB
       (Offline Data)
             |
       Synchronization
             |
        Express Backend
             |
           MongoDB
```

## 1.2 Responsibilities

| Component | Responsibility |
|---|---|
| React | User interface, forms, maps, camera access, and displaying information |
| Express | Authentication, API routing, validation, business logic, and database communication |
| MongoDB | Persistent cloud storage for users, parties, messages, locations, pins, submissions, and points |
| IndexedDB | Temporarily stores relevant application data when offline |
| Python/FastAPI | Receives images and performs animal recognition using YOLO |
| Leaflet | Displays maps, user locations, and shared pins |

---

# 2. General API Standards

## 2.1 API conventions

All endpoints should follow these conventions:

- Base route: `/api/v1`
- JSON for standard requests and responses.
- `multipart/form-data` for image uploads.
- JWT authentication for protected endpoints.
- MongoDB ObjectIds for database identifiers.
- ISO 8601 timestamps for dates.
- HTTPS for production communication.

### HTTP methods

| Method | Purpose |
|---|---|
| GET | Retrieve information |
| POST | Create a resource or perform an action |
| PUT | Replace or update a resource |
| PATCH | Partially update a resource |
| DELETE | Remove a resource |

## 2.2 Standard response format

Successful response:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "id": "resource_id"
  }
}
```

Failed response:

```json
{
  "success": false,
  "message": "Invalid request",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      "Missing required field"
    ]
  }
}
```

### Standard HTTP status codes

| Status | Meaning |
|---|---|
| 200 | Request successful |
| 201 | Resource created |
| 204 | Successfully deleted; no response body |
| 400 | Invalid request |
| 401 | Unauthorized / invalid authentication |
| 403 | Authenticated but lacking permission |
| 404 | Resource not found |
| 409 | Conflict / duplicate resource |
| 413 | Uploaded file too large |
| 422 | Request understood but unable to process |
| 429 | Too many requests |
| 500 | Internal server error |
| 503 | Dependent service unavailable |

---

# 3. Authentication and User Management

**Purpose:** Allow users to register, sign in, and maintain their hunting profiles.

## 3.1 User data model

```json
{
  "_id": "user_id",
  "username": "hunter123",
  "email": "hunter@email.com",
  "passwordHash": "hashed_password",
  "role": "user",
  "points": 150,
  "profilePicture": "image_url",
  "createdAt": "2026-11-08T18:00:00Z",
  "updatedAt": "2026-11-08T18:00:00Z"
}
```

Notes:
- Passwords must be hashed before storage.
- `role` should be either `user` or `admin`.
- Points should be maintained by the backend rather than accepted as an arbitrary user-submitted value.
- Email and username should be unique.

## 3.2 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create an account |
| POST | `/auth/login` | Authenticate a user |
| POST | `/auth/logout` | Log out / invalidate session |
| GET | `/auth/me` | Retrieve current user |
| GET | `/users/:userId` | Retrieve public user profile |
| PATCH | `/users/:userId` | Update user profile |
| DELETE | `/users/:userId` | Delete user account |

### POST `/auth/register`

Request:

```json
{
  "username": "hunter123",
  "email": "hunter@email.com",
  "password": "Password123!"
}
```

Expected behavior:
1. Validate the provided fields.
2. Check whether the username or email already exists.
3. Hash the password.
4. Create the user in MongoDB.
5. Return the created account and authentication information.

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "username": "hunter123",
      "email": "hunter@email.com",
      "role": "user",
      "points": 0
    },
    "token": "jwt_token"
  }
}
```

### POST `/auth/login`

Request:

```json
{
  "email": "hunter@email.com",
  "password": "Password123!"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "user_id",
      "username": "hunter123",
      "role": "user",
      "points": 150
    }
  }
}
```

### GET `/auth/me`

Headers:

```http
Authorization: Bearer <JWT_TOKEN>
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "username": "hunter123",
    "email": "hunter@email.com",
    "role": "user",
    "points": 150
  }
}
```

---

# 4. Hunting Parties

**Purpose:** Allow users to create parties, join parties, and communicate with other hunters.

A party is a persistent group of users. A hunting session is a temporary activity in which party members share live locations.

## 4.1 Party data model

```json
{
  "_id": "party_id",
  "name": "Deer Hunting Group",
  "description": "Weekend hunting group",
  "createdBy": "user_id",
  "members": [
    {
      "userId": "user_id",
      "joinedAt": "2026-11-08T18:00:00Z",
      "role": "owner"
    }
  ],
  "createdAt": "2026-11-08T18:00:00Z"
}
```

## 4.2 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/parties` | Create a party |
| GET | `/parties` | Retrieve parties belonging to the user |
| GET | `/parties/:partyId` | Retrieve party details |
| PATCH | `/parties/:partyId` | Update party details |
| DELETE | `/parties/:partyId` | Delete a party |
| POST | `/parties/:partyId/join` | Join a party |
| POST | `/parties/:partyId/leave` | Leave a party |
| GET | `/parties/:partyId/members` | Retrieve party members |
| DELETE | `/parties/:partyId/members/:userId` | Remove a member |

### POST `/parties`

Request:

```json
{
  "name": "Deer Hunting Group",
  "description": "Weekend hunting group"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "partyId": "party_id",
    "name": "Deer Hunting Group",
    "createdBy": "user_id",
    "members": ["user_id"]
  }
}
```

### POST `/parties/:partyId/join`

Request:

```json
{
  "inviteCode": "ABC123"
}
```

Expected behavior:
- Validate the invitation code if invitation-based membership is implemented.
- Add the user to the party.
- Prevent duplicate membership.
- Notify existing party members.

---

# 5. Hunting Sessions and Geolocation

**Purpose:** Allow party members to share their current locations while hunting.

## 5.1 Hunting session data model

```json
{
  "_id": "session_id",
  "partyId": "party_id",
  "startedBy": "user_id",
  "status": "active",
  "startedAt": "2026-11-08T18:00:00Z",
  "endedAt": null,
  "participants": [
    "user_id_1",
    "user_id_2"
  ]
}
```

## 5.2 Location data model

```json
{
  "_id": "location_id",
  "sessionId": "session_id",
  "partyId": "party_id",
  "userId": "user_id",
  "latitude": 35.3859,
  "longitude": -94.3985,
  "lastUpdated": "2026-11-08T18:10:00Z",
  "isConnected": true
}
```

## 5.3 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/parties/:partyId/sessions` | Start a hunting session |
| GET | `/parties/:partyId/sessions/active` | Retrieve active session |
| GET | `/sessions/:sessionId` | Retrieve session information |
| POST | `/sessions/:sessionId/end` | End a hunting session |
| GET | `/sessions/:sessionId/locations` | Retrieve member locations |
| PUT | `/sessions/:sessionId/locations` | Update user's location |
| GET | `/sessions/:sessionId/members/:userId/location` | Retrieve a member's last known location |

### POST `/parties/:partyId/sessions`

Request:

```json
{
  "participants": [
    "user_id_1",
    "user_id_2"
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "sessionId": "session_id",
    "partyId": "party_id",
    "status": "active",
    "startedAt": "2026-11-08T18:00:00Z"
  }
}
```

### PUT `/sessions/:sessionId/locations`

Request:

```json
{
  "latitude": 35.3859,
  "longitude": -94.3985,
  "recordedAt": "2026-11-08T18:10:00Z"
}
```

Expected behavior:
1. Verify the user belongs to the session's party.
2. Validate the coordinates.
3. Save or update the user's latest location.
4. Broadcast the new location to other session participants.
5. Update the map on connected clients.

### Connection loss behavior

The following should be implemented when a party member loses connection:
- The application should recognize the connection loss.
- Their last known location should remain visible.
- Other party members should receive a notification.
- The notification should appear in both the application window and group chat.

A suggested notification:

```json
{
  "type": "MEMBER_DISCONNECTED",
  "sessionId": "session_id",
  "userId": "user_id",
  "lastKnownLocation": {
    "latitude": 35.3859,
    "longitude": -94.3985
  },
  "timestamp": "2026-11-08T18:15:00Z"
}
```

**Important:** A server cannot always immediately distinguish a lost cellular connection from a closed application or an inactive device. Implement a heartbeat mechanism and mark a member disconnected after a configurable timeout.

---

# 6. Shared Map Pins

**Purpose:** Allow hunters to mark interesting locations on the shared party map.

Pins should remain stored after the hunting session ends. Users should be able to delete their own pins.

## 6.1 Pin data model

```json
{
  "_id": "pin_id",
  "partyId": "party_id",
  "sessionId": "session_id",
  "createdBy": "user_id",
  "description": "Possible deer tracks",
  "latitude": 35.3859,
  "longitude": -94.3985,
  "createdAt": "2026-11-08T18:20:00Z"
}
```

## 6.2 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/parties/:partyId/pins` | Create a shared pin |
| GET | `/parties/:partyId/pins` | Retrieve all party pins |
| GET | `/pins/:pinId` | Retrieve a specific pin |
| PATCH | `/pins/:pinId` | Update pin description |
| DELETE | `/pins/:pinId` | Delete a pin |

### POST `/parties/:partyId/pins`

Request:

```json
{
  "sessionId": "session_id",
  "description": "Possible deer tracks",
  "latitude": 35.3859,
  "longitude": -94.3985
}
```

Response:

```json
{
  "success": true,
  "data": {
    "pinId": "pin_id",
    "partyId": "party_id",
    "createdBy": "user_id",
    "description": "Possible deer tracks",
    "latitude": 35.3859,
    "longitude": -94.3985,
    "createdAt": "2026-11-08T18:20:00Z"
  }
}
```

Expected behavior:
- Pins should be visible to authorized party members.
- Pins should remain after a session ends.
- Users can delete their own pins.
- Pin deletion and editing should be checked against ownership or administrative permissions.

---

# 7. Party Chat

**Purpose:** Allow party members to communicate through real-time group messaging.

## 7.1 Message data model

```json
{
  "_id": "message_id",
  "partyId": "party_id",
  "senderId": "user_id",
  "content": "I found some tracks nearby.",
  "createdAt": "2026-11-08T18:30:00Z"
}
```

## 7.2 REST endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/parties/:partyId/messages` | Retrieve party messages |
| POST | `/parties/:partyId/messages` | Send a message |
| DELETE | `/messages/:messageId` | Delete a message |

### POST `/parties/:partyId/messages`

Request:

```json
{
  "content": "I found some tracks nearby."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "messageId": "message_id",
    "partyId": "party_id",
    "senderId": "user_id",
    "content": "I found some tracks nearby.",
    "createdAt": "2026-11-08T18:30:00Z"
  }
}
```

# 8. Competitions and Community Voting

**Purpose:** Allow users to participate in weekly photography competitions and vote on other users' submissions.

Some example competitions include:
- Best scenery or landscape.
- Best animal photograph.
- Best animal track.
- Antlers.
- Community voting using a thumbs-up system.

## 8.1 Competition data model

```json
{
  "_id": "competition_id",
  "title": "Best Wildlife Photograph",
  "description": "Submit your best wildlife photograph.",
  "category": "wildlife",
  "pointsReward": 100,
  "startDate": "2026-11-08T00:00:00Z",
  "endDate": "2026-11-15T00:00:00Z",
  "status": "active"
}
```

## 8.2 Competition submission data model

```json
{
  "_id": "submission_id",
  "competitionId": "competition_id",
  "userId": "user_id",
  "imageUrl": "image_url",
  "caption": "Deer in the woods",
  "voteCount": 0,
  "createdAt": "2026-11-08T18:00:00Z"
}
```

## 8.3 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/competitions` | Retrieve active competitions |
| GET | `/competitions/:competitionId` | Retrieve competition information |
| POST | `/competitions/:competitionId/submit` | Submit competition entry |
| GET | `/competitions/:competitionId/submissions` | Retrieve entries |
| POST | `/submissions/:submissionId/vote` | Vote for an entry |
| DELETE | `/submissions/:submissionId/vote` | Remove a vote |

### POST `/competitions/:competitionId/submit`

Request: `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| image | File | Yes |
| caption | String | No |
| latitude | Number | Yes |
| longitude | Number | Yes |
| capturedAt | Date | Yes |
| clientSubmissionId | String | Yes |

### POST `/submissions/:submissionId/vote`

Request:

```json
{
  "vote": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "submissionId": "submission_id",
    "voteCount": 15,
    "userVoted": true
  }
}
```

Expected behavior:
- A user cannot vote for their own submission.
- A user should only have one active vote per submission.
- Repeated requests must not create duplicate votes.
- Competition entries should stop accepting votes when the competition closes.
- Vote counts should be calculated and maintained by the backend.

Store individual votes in a separate collection rather than relying exclusively on a number inside the submission document.
---

# 9. Image Uploads and Anti-Cheat Validation

**Purpose:** Ensure uploaded images are authentic enough to qualify for challenges and competitions.

Features include:
- Camera-only image submissions.
- Image metadata inspection.
- GPS verification.
- Duplicate image detection through cryptographic hashing.
- Rejecting submissions outside Arkansas.

## 9.1 Image submission data model

```json
{
  "_id": "submission_id",
  "userId": "user_id",
  "imageUrl": "image_url",
  "imageHash": "sha256_hash",
  "latitude": 35.3859,
  "longitude": -94.3985,
  "capturedAt": "2026-11-08T18:00:00Z",
  "uploadedAt": "2026-11-08T18:05:00Z",
  "validationStatus": "approved",
  "validationResults": {
    "metadataValid": true,
    "locationValid": true,
    "duplicateImage": false
  }
}
```

## 9.2 Validation workflow

```text
User captures photograph
          |
          v
React camera interface
          |
          v
Submit image + metadata
          |
          v
Express receives image
          |
          v
Extract metadata
          |
          v
Check GPS coordinates
          |
          v
Verify Arkansas location
          |
          v
Generate SHA-256 hash
          |
          v
Check duplicate submissions
          |
          v
AI animal recognition (if required)
          |
          v
Approve / Reject / Review
          |
          v
Store image and submission
```

## 9.3 Validation requirements

| Validation | Expected behavior |
|---|---|
| File validation | Reject unsupported file formats |
| File size | Enforce a maximum upload size |
| Metadata | Extract available EXIF information |
| GPS | Verify submitted coordinates against metadata |
| Arkansas restriction | Reject invalid locations outside Arkansas |
| Image hash | Reject exact duplicate image files |
| Camera-only workflow | Frontend should capture images through the application camera |
| Compression | Compress images before or during storage |
| AI validation | Check whether the expected animal is present |

### Important implementation details

**Camera-only uploads:** The frontend should use the browser camera interface (`getUserMedia` or a suitable camera capture input). The backend can validate metadata and image content, but cannot conclusively prove that a photograph originated from the device camera.

**Image hashing:** Use SHA-256 to generate a cryptographic hash. Store the hash in MongoDB and create a unique index where appropriate. A repeated exact image should be rejected.

**GPS validation:** Compare the EXIF GPS coordinates against the submitted coordinates. Reject missing or inconsistent metadata according to the submission rules.

**Arkansas validation:** The backend should check whether the coordinates fall within the permitted Arkansas geographic boundary. Do not rely on the frontend to perform this validation.

**Privacy:** Avoid returning raw GPS metadata or exact hunting coordinates in public competition entries. Public gallery information should be separate from private location records.

---

# 10. AI/ML Animal Recognition

**Purpose:** Allow users to scan animals and receive information about the identified animal and relevant hunting guidelines.

## 10.1 Supported animal classes
- Deer
- Wild boars
- Rabbits
- Squirrels
- Black bears

The exact model class names and labels should be standardized between YOLO and Express.

## 10.2 AI service architecture

```text
React
  |
  | Upload animal photograph
  v
Express Backend
  |
  | Forward image
  v
Python FastAPI
  |
  v
YOLO Model
  |
  | Animal prediction
  v
FastAPI Response
  |
  v
Express Backend
  |
  | Retrieve animal information
  v
MongoDB
  |
  v
React displays results
```

## 10.3 FastAPI endpoint

This endpoint belongs to the Python AI service rather than the public Express API.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/predict` | Identify animals in an image |
| GET | `/health` | Check whether the AI service is available |

### POST `/predict`

Request: `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| image | File | Yes |

Expected response:

```json
{
  "success": true,
  "data": {
    "detected": true,
    "predictions": [
      {
        "animal": "deer",
        "confidence": 0.94
      }
    ]
  }
}
```

If no animal is detected:

```json
{
  "success": true,
  "data": {
    "detected": false,
    "predictions": [],
    "message": "No recognizable animal detected."
  }
}
```

If the model identifies an animal with insufficient confidence, the service should return an uncertain result rather than forcing an incorrect classification.


The animal information should be retrieved from a controlled database or predefined information source rather than generated freely by the recognition model.


---

# 11. Leaderboard and Points

**Purpose:** Display users with the highest point totals.

## 11.1 Points data model

```json
{
  "_id": "transaction_id",
  "userId": "user_id",
  "sourceType": "challenge",
  "sourceId": "submission_id",
  "points": 50,
  "description": "Completed weekly deer challenge",
  "createdAt": "2026-11-08T18:00:00Z"
}
```

## 11.2 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/leaderboard` | Retrieve global leaderboard |
| GET | `/leaderboard/me` | Retrieve user's ranking |
| GET | `/users/:userId/points` | Retrieve user's points |
| GET | `/users/:userId/points/history` | Retrieve points history |

### GET `/leaderboard`

Optional query parameters:

```http
GET /api/v1/leaderboard?limit=10&page=1
```

Response:

```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "userId": "user_id_1",
        "username": "hunter123",
        "points": 500
      },
      {
        "rank": 2,
        "userId": "user_id_2",
        "username": "hunter456",
        "points": 350
      }
    ],
    "page": 1,
    "limit": 10
  }
}
```

Points should only be awarded by trusted backend processes after successful challenge or competition validation.

---

# 12. Offline Data and Synchronization

**Purpose:** Keep essential application information available when users lose cellular connectivity.

This is particularly important for hunting sessions, where users may lose service in the wilderness.

## 12.1 Offline functionality

The frontend should store relevant data locally, such as:

- Cached party information.
- Previously loaded chat messages.
- Hunting session information.
- Last known party member locations.
- Shared pins.
- Challenge information.
- Pending messages.
- Pending submissions, where supported.

Not every operation needs to work offline. Authentication, new account creation, and operations requiring immediate server validation should generally require connectivity.

## 12.2 Synchronization endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/sync/push` | Send locally stored changes to the server |
| GET | `/sync/pull` | Retrieve cloud changes |
| GET | `/sync/status` | Retrieve synchronization status |

### POST `/sync/push`

Request:

```json
{
  "deviceId": "device_id",
  "changes": [
    {
      "clientId": "local_message_001",
      "type": "message",
      "action": "create",
      "partyId": "party_id",
      "data": {
        "content": "I found some tracks nearby."
      },
      "createdAt": "2026-11-08T18:30:00Z"
    },
    {
      "clientId": "local_pin_001",
      "type": "pin",
      "action": "create",
      "partyId": "party_id",
      "data": {
        "description": "Possible deer tracks",
        "latitude": 35.3859,
        "longitude": -94.3985
      },
      "createdAt": "2026-11-08T18:35:00Z"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "processed": 2,
    "failed": 0,
    "results": [
      {
        "clientId": "local_message_001",
        "status": "synced",
        "serverId": "message_id"
      },
      {
        "clientId": "local_pin_001",
        "status": "synced",
        "serverId": "pin_id"
      }
    ]
  }
}
```

### GET `/sync/pull`

Request:

```http
GET /api/v1/sync/pull?lastSyncedAt=2026-11-08T18:00:00Z
```

Response:

```json
{
  "success": true,
  "data": {
    "changes": [
      {
        "type": "message",
        "action": "create",
        "data": {
          "messageId": "message_id",
          "content": "I found some tracks nearby."
        }
      }
    ],
    "syncedAt": "2026-11-08T19:00:00Z"
  }
}
```

## 12.3 Synchronization rules

1. Store offline changes in IndexedDB.
2. Assign each local operation a unique client ID.
3. When connectivity returns, send pending changes to Express.
4. Express validates the changes and checks whether they were already processed.
5. Valid changes are stored in MongoDB.
6. The backend returns a success or failure result for each change.
7. The frontend updates IndexedDB with the server response.
8. The frontend pulls new cloud changes to update its local information.

**Important:** Synchronization must be idempotent. If a user sends the same offline message multiple times because of a retry, the backend must not create multiple copies.

For location updates, use the newest valid timestamp. For chat messages and pins, preserve individual records instead of overwriting them.

Submissions that require anti-cheat validation should remain pending until the server can validate them. Do not award points offline.

---

# 13. Administration

**Purpose:** Provide administrative functionality for moderation for competitions.

## 13.1 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| DELETE | `/admin/competitions/:competitionId/submissions/:submissionId` | Delete a submission |
| GET | `/admin/submissions/reports` | Retrieve submissions needing review |
| PATCH | `/admin/reports/:submissionId/dismiss` | Dismiss the report |

All administrative endpoints must require an authenticated user with the `admin` role.

Direct unrestricted database access should never be exposed through a public API endpoint.

---

# 14. Database Collections

| Collection | Purpose |
|---|---|
| `competitions` | competitions data |
| `imageGallery` | image storage |
| `locations` | Current and last-known member locations |
| `messages` | Party chat messages |
| `parties` | Hunting parties and membership |
| `pins` | Persistent shared map pins |
| `sessions` | Hunting sessions |
| `users` | User accounts and profiles |
| `userEntries` | User entries in competitions |
| `leaderboard` | Leaderboard data |


# 15. Authentication and Security Requirements

Every protected endpoint should validate the user's JWT.

```text
authenticateToken
      |
      v
Verify JWT
      |
      v
Retrieve User
      |
      v
Check Permissions
      |
      v
Continue to Controller
```

 Authorization rules:

| Resource | Permission |
|---|---|
| User profile | User can update their own profile |
| Party | Party members can access party information |
| Party management | Owner/admin can manage membership |
| Hunting session | Authorized party members |
| Shared pins | Party members; owners can delete their own |
| Chat | Party members |
| Competition submissions | Authenticated users |
| Competition voting | Authenticated eligible users |
| Leaderboard | Authenticated users for competitions |
| Admin endpoints | Admin only |

Additional security requirements:
- Hash passwords using bcrypt.
- Validate and sanitize incoming requests.
- Validate uploaded image types and sizes.
- Rate-limit authentication and upload endpoints.
- Keep JWT secrets and database credentials in environment variables.
- Restrict CORS to approved application origins.
- Avoid exposing sensitive GPS coordinates in public API responses.
- Do not trust user-submitted point totals, roles, or vote counts.
- Restrict access to uploaded images.

---

# 16. Suggested Project Folder Structure

```text
HuntCredible/
│
├── documentation/
| 
├── client/
│   ├── src/
│   │   ├── public/
│   │
│   ├── .dockerignore
│   ├── .gitignore
│   ├── .oxlintrc.json
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── index.html
│   ├── nginx.conf
│   ├── package-lock.json
│   ├── postcss.config.cjs
│   ├── README.md
│   ├── vite.config.js
│   └── package.json
│
├── backend/
│   ├── routes/
│   ├── middleware/
│   ├── services/6
│   ├── .env.example
│   ├── db.js
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── index.js
| 
│
├── ai-service/
│   ├── docs/
|   ├── models/
|   ├── services/
|   ├── tests/
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── compose.yml