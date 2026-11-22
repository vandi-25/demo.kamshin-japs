import "server-only";

import mongoose from "mongoose";

// Shared Mongoose connection. Call `await connectDB()` before using the models.

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

// reuse the connection across hot reloads / warm lambdas
const globalForMongoose = globalThis as unknown as { mongooseCache?: Cache };
const cache: Cache = globalForMongoose.mongooseCache ?? { conn: null, promise: null };
globalForMongoose.mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add your MongoDB Atlas connection string to .env.");
  }

  cache.promise ??= mongoose.connect(uri, {
    // fail fast instead of queueing while disconnected
    bufferCommands: false,
    // keep it small for serverless
    maxPoolSize: 10,
    // default is 30s
    serverSelectionTimeoutMS: 8000,
    // default is no timeout at all, which hangs if the network drops
    socketTimeoutMS: 15000,
  });

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}
