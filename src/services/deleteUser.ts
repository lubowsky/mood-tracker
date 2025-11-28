import { getCollection } from "../models/database";
import { UserCollection, User } from "../models/User";
import { MoodEntryCollection } from "../models/MoodEntry";

export async function deleteUserData(telegramId: number) {
  const users = await getCollection(UserCollection);
  const moodEntries = await getCollection(MoodEntryCollection);

  const user = await users.findOne({ telegramId }) as User | null;

  if (!user) {
    console.warn(`deleteUserData: User with telegramId ${telegramId} not found`);
    return;
  }

  const userId = user._id!;

  await moodEntries.deleteMany({ userId });

  await users.deleteOne({ _id: userId });

  console.log(`deleteUserData: Deleted user ${telegramId} and all related mood entries.`);
}
