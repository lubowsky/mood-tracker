import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();

  const db = client.db();
  const users = db.collection("users");

  const result = await users.updateMany(
    { "settings.homeName": { $exists: false } },
    [
      {
        $set: {
          "settings.homeName": {
            $ifNull: ["$firstName", "Друг"]
          }
        }
      }
    ]
  );

  console.log(`Updated ${result.modifiedCount} users`);
  await client.close();
}

run().catch(console.error);
