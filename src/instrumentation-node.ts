import { sweepTempFiles } from "./lib/server/temp";

const sweep = () => sweepTempFiles().catch((error) => console.warn("Temp sweep failed", error));
void sweep();
// Every 10 minutes, so nothing outlives the 1-hour promise by much.
setInterval(sweep, 10 * 60_000).unref();
