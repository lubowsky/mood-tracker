import { Context } from 'grammy';
import { getCollection } from '../../models/database';
import { User, UserCollection, defaultUserSettings } from '../../models/User';

export interface MyContext extends Context {
  user?: User;
}

export async function userMiddleware(ctx: MyContext, next: () => Promise<void>) {
  if (!ctx.from) return next();

  const usersCollection = await getCollection(UserCollection);
  
  let user = await usersCollection.findOne({ telegramId: ctx.from.id }) as User;
  
  if (!user) {
    const newUser: User = {
      telegramId: ctx.from.id,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      username: ctx.from.username,
      createdAt: new Date(),
      settings: defaultUserSettings
    };
    
    const result = await usersCollection.insertOne(newUser);
    user = { ...newUser, _id: result.insertedId };
  }  else {
    // Для существующих пользователей - убеждаемся что все поля есть
    const updatedSettings = { ...defaultUserSettings, ...user.settings };
    
    // Если настройки изменились - обновляем
    if (JSON.stringify(user.settings) !== JSON.stringify(updatedSettings)) {
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { settings: updatedSettings } }
      );
      user.settings = updatedSettings;
    }
  }
  
  ctx.user = user;
  await next();
}
