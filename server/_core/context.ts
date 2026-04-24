import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
console.log("[Context] DISABLE_AUTH =", process.env.DISABLE_AUTH);
export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Usuário fake para desenvolvimento local com auth desabilitada
const DEV_USER = {
  id: "dev-user-local",
  openId: "dev-user-local",
  email: "dev@local",
  name: "Developer",
  role: "admin",
  loginMethod: null,
  lastSignedIn: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as User;

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Bypass de autenticação para desenvolvimento local
  if (process.env.DISABLE_AUTH === "true") {
    return {
      req: opts.req,
      res: opts.res,
      user: DEV_USER,
    };
  }

  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}