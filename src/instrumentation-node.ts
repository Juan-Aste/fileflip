import { sweepTempFiles } from "./lib/server/temp";

const sweep = () => sweepTempFiles().catch((error) => console.warn("Temp sweep failed", error));
void sweep();
// Every 10 minutes, so nothing outlives the 1-hour promise by much.
setInterval(sweep, 10 * 60_000).unref();

// Auth.js collections need indexes the adapter doesn't create.
if (process.env.MONGODB_URI) {
  void (async () => {
    const [{ getMongoClient }, { ensureIndexes }] = await Promise.all([
      import("./lib/mongo-client"),
      import("./lib/server/indexes"),
    ]);
    await ensureIndexes((await getMongoClient()).db());
  })().catch((error) => console.warn("Index setup failed", error));
}
