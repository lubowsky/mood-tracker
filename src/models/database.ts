// src\models\database.ts
import { MongoClient, Db } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

let db: Db;
let client: MongoClient;
let isConnected = false;

export const connectToDatabase = async (): Promise<Db> => {
  if (isConnected && db) {
    return db;
  }

  // 🔴 ФИКС ДЛЯ IPv6 - принудительно используем 127.0.0.1
  let uri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/mood_tracker';
  
  // Заменяем localhost на 127.0.0.1 на всякий случай
  uri = uri.replace('localhost', '127.0.0.1');

  console.log(`🔌 Attempting to connect to MongoDB...`);
  console.log(`📊 Using URI: ${uri.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@')}`);

  try {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // 🔴 ПРИНУДИТЕЛЬНО IPv4
    });
    
    await client.connect();
    db = client.db();
    isConnected = true;
    
    console.log('✅ Successfully connected to MongoDB');
    
    // Проверяем подключение
    await db.admin().ping();
    console.log('✅ Database ping successful');
    
    return db;
  } catch (error) {
    isConnected = false;
    
    if (error instanceof Error) {
      console.error('❌ Failed to connect to MongoDB:', error.message);
      
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Docker running:', !!process.env.DOCKER_RUNNING);
      console.error('   2. MongoDB port open:', await isPortOpen('127.0.0.1', 27017));
      console.error('   3. Using URI:', uri);
    }
    
    throw error;
  }
};

// Вспомогательная функция для проверки порта
async function isPortOpen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    
    socket.setTimeout(2000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

export const getCollection = (collectionName: string) => {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase() first.');
  }
  return db.collection(collectionName);
};

export const isDatabaseConnected = (): boolean => {
  return isConnected;
};