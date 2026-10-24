import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecovision';
  
  try {
    // Attempt connecting with 3-second server selection timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[MongoDB] Connected successfully to: ${uri}`);
  } catch (error) {
    console.warn(`[MongoDB] Could not reach external MongoDB at '${uri}'.`);
    console.log('[MongoDB] Spawning embedded in-memory MongoDB server for seamless zero-config local operation...');
    
    try {
      memoryServer = await MongoMemoryServer.create({
        instance: { dbName: 'ecovision' }
      });
      const memUri = memoryServer.getUri();
      await mongoose.connect(memUri);
      console.log(`[MongoDB] Connected to in-memory MongoDB fallback at: ${memUri}`);
    } catch (memErr) {
      console.error('[MongoDB] Critical error starting in-memory database:', memErr);
      throw memErr;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
}
