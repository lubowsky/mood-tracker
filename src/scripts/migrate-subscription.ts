// src/scripts/migrate-subscription.ts
import { MongoClient } from 'mongodb';
import { up } from '../migrations/init-subscriptions';
import { config } from 'dotenv';
import path from 'path';

// 1. Логика определения env-файла как в твоем index.ts
const envFile = process.env.NODE_ENV === "production" 
  ? ".env.production" 
  : ".env.dev";

config({ path: path.resolve(process.cwd(), envFile) });

async function migrate() {
  // Проверяем все возможные ключи, которые ты используешь
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.MONGO_URI;

  if (!uri) {
    console.error(`❌ Ошибка: Строка подключения не найдена!`);
    console.error(`Убедись, что в файле ${envFile} задана переменная MONGODB_URI`);
    process.exit(1);
  }

  console.log(`📡 Подключение к: ${uri.replace(/:([^@]+)@/, ':***@')}`);

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    await up(db);
    console.log('✅ Миграция успешно завершена');
  } catch (err) {
    console.error('❌ Ошибка во время миграции:', err);
    throw err;
  } finally {
    await client.close();
  }
}

migrate().catch(() => process.exit(1));