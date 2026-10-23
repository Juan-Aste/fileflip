import "server-only";
import { ObjectId } from "mongodb";
import { TERMS_VERSION } from "@/config/legal";
import { getMongoClient } from "@/lib/mongo-client";

/**
 * Records on the user (Auth.js' users collection) that they accepted the
 * current terms: signing in is accepting them, as the login page says next
 * to the buttons. Users without the fields (older accounts) get them on
 * their next sign-in; the date only changes when the version does.
 */
export async function recordTermsAcceptance(userId: string, now = new Date()) {
  if (!ObjectId.isValid(userId)) return;
  const users = (await getMongoClient()).db().collection("users");
  await users.updateOne(
    { _id: new ObjectId(userId), termsVersion: { $ne: TERMS_VERSION } },
    { $set: { termsVersion: TERMS_VERSION, termsAcceptedAt: now } },
  );
}
