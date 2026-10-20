import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  const indexFile = path.join(distPath, "index.html");
  if (!fs.existsSync(indexFile)) {
    throw new Error(`Frontend build missing: ${indexFile}. Run pnpm build first.`);
  }
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(indexFile);
  });
}
