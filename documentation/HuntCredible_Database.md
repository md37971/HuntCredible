# HuntCredible — Database Documentation

**Database Name:** `HuntCredible`

## 1. Users

**Overview:**

The `users` collection stores registered user accounts and profile information. It manages user authentication, account details, permissions, and accumulated points.

**Fields:**

| Field | Data Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier for the user. |
| `email` | String | User's email address. |
| `passwordHash` | String | Hashed user password. |
| `firstName` | String | User's first name. |
| `lastName` | String | User's last name. |
| `role` | String | Defines the user's permission level. |
| `points` | Number | Total accumulated points earned by the user. |
| `createdAt` | Date | Date and time the account was created. |

## 2. UserEntries

**Overview:**

The `userEntries` collection stores individual submissions made by users for competitions. Each entry contains the submitted image, location information, submission details, and review status.

**Fields:**

| Field | Data Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier for the submission. |
| `competitionId` | ObjectId | Identifies the competition associated with the submission. |
| `userId` | ObjectId | Identifies the user who submitted the entry. |
| `clientSubmissionId` | String | Client-generated identifier used to prevent duplicate submissions. |
| `image` | Binary | Stores the submitted image data. |
| `imageType` | String | Specifies the image format or MIME type. |
| `latitude` | Number | Latitude where the image was captured. |
| `longitude` | Number | Longitude where the image was captured. |
| `capturedAt` | Date | Date and time the image was captured. |
| `submittedAt` | Date | Date and time the submission was received. |
| `status` | String | Indicates the submission's review status. |
| `animalDetected` | String / Null | Identifies the animal detected in the submitted image. |
| `pointsAwarded` | Number | Number of points awarded for the submission. |

## 3. Sessions

**Overview:**

The `sessions` collection stores hunting session information. It tracks when a hunting session begins and ends, which party is participating, and which users are involved.

**Fields:**

| Field | Data Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier for the hunting session. |
| `partyId` | ObjectId | Identifies the party associated with the session. |
| `startedBy` | ObjectId | Identifies the user who started the session. |
| `status` | String | Indicates the current status of the hunting session. |
| `startedAt` | Date | Date and time the session started. |
| `endedAt` | Date / Null | Date and time the session ended. |
| `participants` | Array | Contains information about users participating in the session. |

## 4. Pins

**Overview:**

The `pins` collection stores map markers created by users during hunting sessions. These pins allow party members to share important locations on the map.

**Fields:**

| Field | Data Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier for the map pin. |
| `partyId` | ObjectId | Identifies the party associated with the pin. |
| `sessionId` | ObjectId | Identifies the hunting session associated with the pin. |
| `createdBy` | ObjectId | Identifies the user who created the pin. |
| `description` | String | Describes the purpose or details of the pin. |
| `latitude` | Number | Latitude of the pinned location. |
| `longitude` | Number | Longitude of the pinned location. |
| `createdAt` | Date | Date and time the pin was created. |

## 5. Parties

**Overview:**

The `parties` collection stores hunting groups created by users. It manages party information, ownership, and membership.

**Fields:**

| Field | Data Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier for the party. |
| `name` | String | Name of the hunting party. |
| `description` | String | Description of the hunting party. |
| `createdBy` | ObjectId | Identifies the user who created the party. |
| `members` | Array | Contains information about users who belong to the party. |
| `createdAt` | Date | Date and time the party was created. |

## 6. Messages

**Overview:**

The `messages` collection stores messages exchanged between members of a hunting party. It allows users to communicate with other members within their group.

**Fields:**

| Field | Data Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier for the message. |
| `partyId` | ObjectId | Identifies the party where the message was sent. |
| `senderId` | ObjectId | Identifies the user who sent the message. |
| `content` | String | Contains the message text. |
| `createdAt` | Date | Date and time the message was sent. |

## 7. Locations

**Overview:**

The `locations` collection stores GPS coordinates for users participating in hunting sessions. It allows party members to view and share one another's locations.

**Fields:**

| Field | Data Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier for the location record. |
| `sessionId` | ObjectId | Identifies the hunting session associated with the location. |
| `partyId` | ObjectId | Identifies the party associated with the location. |
| `userId` | ObjectId | Identifies the user associated with the location. |
| `latitude` | Number | User's current latitude. |
| `longitude` | Number | User's current longitude. |
| `lastUpdated` | Date | Date and time the location was last updated. |
| `isConnected` | Boolean | Indicates whether the user is currently connected. |

## 8. Competitions

**Overview:**

The `competitions` collection stores information about available hunting competitions. It manages competition details, categories, schedules, and potential point rewards.

**Fields:**

| Field | Data Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier for the competition. |
| `title` | String | Name or title of the competition. |
| `description` | String | Provides details about the competition. |
| `category` | String | Identifies the competition category. |
| `pointsReward` | Number | Number of points available as a competition reward. |
| `startDate` | Date | Date and time the competition begins. |
| `endDate` | Date | Date and time the competition ends. |
| `status` | String | Indicates the current competition status. |

## 9. Leaderboard

**Overview:**

The `leaderboard` collection stores individual points transactions earned by users. Each record tracks how points were awarded, the activity responsible for the points, and when the transaction occurred. These records can be used to maintain a user's points history and support leaderboard rankings.

**Fields:**

| Field | Data Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier for the points transaction. |
| `userId` | ObjectId | Identifies the user who earned the points. |
| `sourceType` | String | Identifies the type of activity that awarded the points, such as a challenge or competition. |
| `sourceId` | ObjectId | Identifies the submission or activity associated with the points transaction. |
| `points` | Number | Number of points earned in the transaction. |
| `description` | String | Describes why the points were awarded. |
| `createdAt` | Date | Date and time the points transaction occurred. |