import "server-only";
import { MongoClient } from "mongodb";

// Native driver client for the Auth.js adapter (Mongoose keeps its own pool).
// Created lazily, on the first request that needs it.
const globalForMongo = globalThis as typeof globalThis & { _mongoClient?: Promise<MongoClient> };

/**
 * A connected client. If connecting fails the client is dropped, so the next
 * call tries again: a MongoClient whose first connection failed stays closed
 * for good ("Topology is closed"), which kept sign-in broken after MongoDB
 * came back until the app was restarted (B-16).
 */
export function getMongoClient(uri = process.env.MONGODB_URI, serverSelectionTimeoutMS = 5_000): Promise<MongoClient> {
  if (!uri) return Promise.reject(new Error("MONGODB_URI is not set"));
  globalForMongo._mongoClient ??= new MongoClient(uri, { serverSelectionTimeoutMS })
    .connect()
    .catch((error: unknown) => {
      globalForMongo._mongoClient = undefined;
      throw error;
    });
  return globalForMongo._mongoClient;
}
