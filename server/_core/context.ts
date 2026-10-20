import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const DEV_USER: User = {
  id: 1,
  openId: "dev-user-local",
  email: "dev@local",
  name: "Developer",
  role: "admin",
  loginMethod: null,
  lastSignedIn: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  if (process.env.DISABLE_AUTH === "true") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DISABLE_AUTH is forbidden in production");
    }
    return { ...opts, user: DEV_USER };
  }

  let user: User | null = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }
  return { ...opts, user };
}
