import dotenv from "dotenv";
import { connectDb, getDb, closeDb } from "./db.js";

dotenv.config();

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();
const at = (offset) => new Date(now + offset);

const competitions = [
    {
        seedKey: "best-wildlife-photo",
        title: "Best Wildlife Photograph",
        description: "Submit your best wildlife photograph taken this week. Any wild animal counts.",
        category: "wildlife",
        targetAnimal: null,
        pointsReward: 100,
        startDate: at(-2 * DAY),
        endDate: at(5 * DAY),
        status: "active"
    },
    {
        seedKey: "first-deer-sighting",
        title: "First Deer Sighting",
        description: "Photograph a deer in the wild. Bucks, does and fawns all count.",
        category: "wildlife",
        targetAnimal: "deer",
        pointsReward: 50,
        startDate: at(-1 * DAY),
        endDate: at(6 * DAY),
        status: "active"
    },
    {
        seedKey: "best-scenery",
        title: "Best Scenery",
        description: "Show off the view from your stand, blind or trail. Sunrises and sunsets welcome.",
        category: "scenery",
        targetAnimal: null,
        pointsReward: 75,
        startDate: at(-6 * DAY),
        endDate: at(20 * HOUR),
        status: "active"
    },
    {
        seedKey: "best-animal-track",
        title: "Best Animal Track",
        description: "Find and photograph the clearest animal track you can.",
        category: "tracks",
        targetAnimal: null,
        pointsReward: 50,
        startDate: at(3 * DAY),
        endDate: at(10 * DAY),
        status: "upcoming"
    },
    {
        seedKey: "antlers",
        title: "Antlers",
        description: "Shed hunters and successful hunters alike: post your best antler photo.",
        category: "antlers",
        targetAnimal: null,
        pointsReward: 100,
        startDate: at(-12 * DAY),
        endDate: at(-5 * DAY),
        status: "ended"
    }
];

async function seed() {
    const collection = getDb().collection("competitions");

    for (const competition of competitions) {
        const result = await collection.updateOne(
            { seedKey: competition.seedKey },
            {
                $set: { ...competition, updatedAt: new Date() },
                $setOnInsert: { maxEntriesPerUser: 1, createdAt: new Date() }
            },
            { upsert: true }
        );

        const action = result.upsertedCount ? "Added" : "Updated";
        console.log(`${action}: ${competition.title} (${competition.status})`);
    }
}

async function reset() {
    const result = await getDb().collection("competitions").deleteMany({
        seedKey: { $in: competitions.map((c) => c.seedKey) }
    });

    console.log(`Removed ${result.deletedCount} sample competition(s).`);
}

async function main() {
    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI is not set. Run this from the backend folder so .env is found.");
        process.exitCode = 1;
        return;
    }

    try {
        await connectDb();

        if (process.argv.includes("--reset")) {
            await reset();
        } else {
            await seed();
        }
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exitCode = 1;
    } finally {
        await closeDb();
    }
}

main();
