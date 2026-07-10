import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createServer as createViteServer } from "vite";
import { z } from "zod";
import { demoPage } from "./server/demo-page.js";
import { scanPage } from "./server/scanner.js";

const app = express();
const port = Number(process.env.PORT ?? 4173);
const isProduction = process.env.NODE_ENV === "production";
const root = path.dirname(fileURLToPath(import.meta.url));
const requestSchema = z.object({ target: z.string().min(1).max(2_048) });

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "a11ylens", version: "0.1.0" });
});

app.get("/demo-target", (_request, response) => {
  response.type("html").send(demoPage);
});

app.post("/api/scan", async (request, response) => {
  const parsed = requestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Enter a valid audit target." });
    return;
  }

  try {
    const isDemo = parsed.data.target === "demo://checkout";
    const allowPrivateTargets = process.env.A11YLENS_ALLOW_PRIVATE_TARGETS === "true";
    const target = isDemo ? `http://127.0.0.1:${port}/demo-target` : parsed.data.target;
    const report = await scanPage(target, {
      trustedLocal: isDemo || allowPrivateTargets,
      displayUrl: isDemo ? "demo://northstar-checkout" : parsed.data.target,
    });
    response.json(report);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "The scan could not be completed.";
    response.status(422).json({ error: "Audit failed", detail });
  }
});

if (isProduction) {
  app.use(express.static(path.join(root, "dist")));
  app.use((_request, response) => response.sendFile(path.join(root, "dist", "index.html")));
} else {
  const vite = await createViteServer({ root, server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
}

app.listen(port, "127.0.0.1", () => {
  console.log(`A11yLens is running at http://127.0.0.1:${port}`);
});
