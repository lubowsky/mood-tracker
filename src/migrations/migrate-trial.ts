import { getCollection } from '../models/database';
import { UserCollection } from '../models/User';

async function migrateTrialStatus() {
  console.log('🚀 Starting migration: setting trial status for old users...');
  
  const usersCollection = await getCollection(UserCollection);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await usersCollection.updateMany(
    { 
      createdAt: { $lt: twentyFourHoursAgo },
      isTrialExhausted: { $exists: false } 
    },
    { 
      $set: { isTrialExhausted: true } 
    }
  );

  console.log(`✅ Migration finished! Updated ${result.modifiedCount} users.`);
  process.exit(0);
}

migrateTrialStatus().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
