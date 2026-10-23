import { spawn, type ChildProcess } from "node:child_process";

/**
 * The production build (`next start`) on `port` with exactly `env` (plus
 * PATH/HOME), resolved once /api/health answers. kill() stops it.
 */
export async function startApp(port: number, env: Record<string, string>): Promise<ChildProcess> {
  const base = `http://127.0.0.1:${port}`;
  if (await fetch(`${base}/api/health`).then(() => true, () => false)) throw new Error(`Port ${port} is already in use`);
  // Node runs Next directly (not through npx), so kill() stops the server.
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-p", String(port)], {
    env: { PATH: process.env.PATH!, HOME: process.env.HOME!, NODE_ENV: "production", ...env },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr!.on("data", (chunk) => (stderr += chunk));
  for (let i = 0; i < 120; i++) {
    if (await fetch(`${base}/api/health`).then((r) => r.ok, () => false)) return child;
    if (child.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  child.kill();
  throw new Error(`next start did not come up on ${port}: ${stderr.slice(-2000)}`);
}
