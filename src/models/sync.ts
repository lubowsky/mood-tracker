import { connectToDatabase, getCollection } from './database';
import { UserCollection, MoodEntryCollection } from './MoodEntry';

async function syncIndexes() {
  try {
    await connectToDatabase();
    
    const usersCollection = getCollection(UserCollection);
    await usersCollection.createIndex({ telegramId: 1 }, { unique: true });
    
    const entriesCollection = getCollection(MoodEntryCollection);
    await entriesCollection.createIndex({ userId: 1, timestamp: -1 });
    await entriesCollection.createIndex({ timestamp: 1 });
    await entriesCollection.createIndex({ timeOfDay: 1 });
    await entriesCollection.createIndex({ source: 1 });
    await entriesCollection.createIndex({ userId: 1, source: 1 });
    await entriesCollection.createIndex({ 'sleepData.quality': 1 });
    
    console.log('Database indexes synchronized');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing indexes:', error);
    process.exit(1);
  }
}

syncIndexes();