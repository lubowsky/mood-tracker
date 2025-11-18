// mongo-init.example.js

db = db.getSiblingDB('mood_tracker');

db.createUser({
  user: 'mood_tracker_user',
  pwd: 'REPLACE_WITH_STRONG_PASSWORD', // ЗАМЕНИТЬ для продакшена!
  roles: [
    {
      role: 'readWrite',
      db: 'mood_tracker'
    }
  ]
});

// Создаем базовые коллекции и индексы
db.createCollection('users');
db.createCollection('mood_entries');

// Индексы для оптимизации
db.users.createIndex({ "telegramId": 1 }, { unique: true });
db.mood_entries.createIndex({ "userId": 1, "timestamp": -1 });
db.mood_entries.createIndex({ "timestamp": 1 });
db.mood_entries.createIndex({ "timeOfDay": 1 });

print('MongoDB initialization completed!');
