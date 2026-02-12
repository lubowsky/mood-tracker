import { getCollection, connectToDatabase } from '../models/database';
import { UserCollection } from '../models/User';
import { config } from "dotenv";
import path from "path";

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.dev";
config({ path: path.resolve(process.cwd(), envFile) });

async function migrateTrialStatus() {
  try {
    console.log(`⚙️  Using env: ${envFile}`);
    console.log('🚀 Connecting to database for migration...');
    
    await connectToDatabase();
    
    const usersCollection = await getCollection(UserCollection);
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log(`🔍 Searching for users registered before ${twentyFourHoursAgo.toISOString()}...`);

    /**
     * Логика миграции:
     * 1. Ищем всех, у кого дата создания меньше (раньше) чем 24 часа назад.
     * 2. И у кого поле isTrialExhausted еще не существует (чтобы не трогать тех, кого уже обработали).
     */
    const result = await usersCollection.updateMany(
      { 
        createdAt: { $lt: twentyFourHoursAgo },
        isTrialExhausted: { $exists: false } 
      },
      { 
        $set: { isTrialExhausted: true } 
      }
    );

    console.log('---');
    console.log(`✅ Migration successful!`);
    console.log(`📊 Users processed and updated: ${result.modifiedCount}`);
    console.log('---');

  } catch (error) {
    console.error('❌ Migration failed with error:', error);
  } finally {
    process.exit(0);
  }
}

migrateTrialStatus();
