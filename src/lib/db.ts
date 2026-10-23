import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Reuse the connection across hot reloads in dev and across invocations in prod.
const globalForMongoose = globalThis as typeof globalThis & {
  _mongoose?: MongooseCache;
};

const cache: MongooseCache =
  globalForMongoose._mongoose ?? (globalForMongoose._mongoose = { conn: null, promise: null });

export async function connectToDatabase(uri = process.env.MONGODB_URI): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 5_000 });
  }
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
