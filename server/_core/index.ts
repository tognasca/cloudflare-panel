import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./vite";

async function startServer() {
  if (process.env.NODE_ENV === "production" && process.env.DISABLE_AUTH === "true") {
    throw new Error("DISABLE_AUTH must not be enabled in production");
  }
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use("/api/trpc", createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`[tRPC] ${path ?? "unknown"}: ${error.message}`);
    },
  }));
  if (process.env.NODE_ENV === "production") serveStatic(app);
  const port = Number(process.env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  const host = process.env.HOST ?? "127.0.0.1";
  server.listen(port, host, () => console.log(`Server listening on ${host}:${port}`));
}

startServer().catch(error => { console.error(error); process.exitCode = 1; });
