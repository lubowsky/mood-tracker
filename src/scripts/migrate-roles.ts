import { MongoClient } from 'mongodb';
import { up } from '../migrations/add-user-roles';
import { config } from 'dotenv';
import path from 'path';

// Определяем, какой .env загрузить
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.dev";
config({ path: path.resolve(process.cwd(), envFile) });

async function migrate() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  
  if (!uri) {
    console.error('❌ Ошибка: MONGODB_URI не найден в .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('🔌 Подключено к MongoDB для миграции ролей...');
    
    await up(client.db());
    
    console.log('✅ Миграция ролей успешно завершена');
  } catch (err) {
    console.error('❌ Ошибка при миграции:', err);
  } finally {
    await client.close();
    process.exit(0);
  }
}

migrate();