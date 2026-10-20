import "server-only";
import type { CreateIndexesOptions, Db, IndexSpecification } from "mongodb";

interface IndexDef {
  collection: string;
  key: IndexSpecification;
  options?: CreateIndexesOptions;
}

/**
 * Indexes for the Auth.js collections, which the adapter does not create.
 * The session lookup runs on every `/api/auth/session` call. Mongoose models
 * (ConversionLog, Subscription) declare their own indexes in the schema.
 */
export const authIndexes: IndexDef[] = [
  { collection: "users", key: { email: 1 }, options: { unique: true, partialFilterExpression: { email: { $type: "string" } } } },
  { collection: "accounts", key: { provider: 1, providerAccountId: 1 }, options: { unique: true } },
  { collection: "accounts", key: { userId: 1 } },
  { collection: "sessions", key: { sessionToken: 1 }, options: { unique: true } },
  { collection: "sessions", key: { userId: 1 } },
  // Expired sessions and magic-link tokens are removed by MongoDB itself.
  { collection: "sessions", key: { expires: 1 }, options: { expireAfterSeconds: 0 } },
  { collection: "verification_tokens", key: { identifier: 1, token: 1 }, options: { unique: true } },
  { collection: "verification_tokens", key: { expires: 1 }, options: { expireAfterSeconds: 0 } },
];

/** Creates the missing indexes (a no-op for existing ones). Never throws. */
export async function ensureIndexes(db: Db, defs: IndexDef[] = authIndexes): Promise<number> {
  let failed = 0;
  for (const { collection, key, options } of defs) {
    try {
      await db.collection(collection).createIndex(key, options);
    } catch (error) {
      failed++;
      console.warn(`Could not create index on ${collection}`, error);
    }
  }
  return failed;
}
