"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Plan } from "@/config/limits";

export interface SessionInfo {
  /** False until the session has been checked. */
  loaded: boolean;
  signedIn: boolean;
  plan: Plan;
}

const initial: SessionInfo = { loaded: false, signedIn: false, plan: "free" };
const SessionInfoContext = createContext<SessionInfo>(initial);

/**
 * Who is visiting, read once on the client so pages stay static. Used for
 * plan limits, hiding ads for Pro and the header's account link.
 */
export function SessionInfoProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState(initial);

  useEffect(() => {
    // Not needed for the first paint: wait until the browser is idle so the
    // request doesn't compete with the page's own resources.
    const load = () =>
      fetch("/api/auth/session")
        .then((r) => (r.ok ? r.json() : null))
        .then((s) =>
          setInfo({ loaded: true, signedIn: Boolean(s?.user), plan: s?.user?.plan === "pro" ? "pro" : "free" }),
        )
        .catch(() => setInfo({ ...initial, loaded: true }));
    if (typeof window.requestIdleCallback !== "function") {
      const id = setTimeout(load, 200);
      return () => clearTimeout(id);
    }
    const id = window.requestIdleCallback(load, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }, []);

  return <SessionInfoContext.Provider value={info}>{children}</SessionInfoContext.Provider>;
}

export const useSessionInfo = () => useContext(SessionInfoContext);
