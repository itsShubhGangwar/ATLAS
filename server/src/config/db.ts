import mongoose from "mongoose";

let mongodInstance: any = null;

export const connectDB = async (): Promise<string> => {
  const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/atlas";

  // Try connecting to configured MongoDB
  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}`);
    return mongoURI;
  } catch (err: any) {
    console.warn(`[Database] Local/Configured MongoDB not reachable at ${mongoURI}: ${err.message}`);
    console.log("[Database] Initializing fallback in-memory MongoDB instance for seamless operation...");

    try {
      // Dynamic import to avoid issues if not needed
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      mongodInstance = await MongoMemoryServer.create();
      const uri = mongodInstance.getUri();
      await mongoose.connect(uri);
      console.log(`[Database] Fallback In-Memory MongoDB connected: ${uri}`);
      return uri;
    } catch (fallbackErr: any) {
      console.error(`[Database] Failed to initialize in-memory MongoDB: ${fallbackErr.message}`);
      throw fallbackErr;
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
      mongodInstance = null;
    }
  } catch (err: any) {
    console.error(`[Database] Error during disconnect: ${err.message}`);
  }
};
