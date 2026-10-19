import "server-only";
import { MongoClient } from "mongodb";

// Native driver client for the Auth.js adapter (Mongoose keeps its own pool).
// Created lazily and not connected up front, as the MongoDB team recommends.
const globalForMongo = globalThis as typeof globalThis & { _mongoClient?: MongoClient };

export function getMongoClient(): MongoClient {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  globalForMongo._mongoClient ??= new MongoClient(uri);
  return globalForMongo._mongoClient;
}
