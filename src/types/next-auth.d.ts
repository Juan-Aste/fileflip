import type { DefaultSession } from "next-auth";
import type { Plan } from "@/config/limits";

declare module "next-auth" {
  interface Session {
    user: { id: string; plan: Plan } & DefaultSession["user"];
  }
}
