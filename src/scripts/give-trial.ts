import { getCollection, connectToDatabase } from '../models/database';
import { UserCollection } from '../models/User';
import { UserSubscriptionCollection } from '../models/UserSubscription';

async function giveTrial() {
  await connectToDatabase();
  const users = await getCollection(UserCollection).find().toArray();
  const subs = getCollection(UserSubscriptionCollection);

  for (const user of users) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Даем 7 дней

    await subs.updateOne(
      { telegramId: user.telegramId },
      {
        $setOnInsert: {
          telegramId: user.telegramId,
          plan: 'tariff_7_free',
          startDate: new Date(),
          endDate: endDate,
          isActive: true,
          autoRenew: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  }
  console.log('✅ Trial period given to all users');
}

giveTrial();