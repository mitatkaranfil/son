import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import { nanoid } from "nanoid";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  try {
    // Dinamik olarak vite ve viteConfig import edilir
    const { createServer: createViteServer, createLogger } = await import("vite");
    const viteConfig = await import("../vite.config");
    const viteLogger = createLogger();

    const serverOptions = {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: ["localhost", "127.0.0.1"],
    };

    const vite = await createViteServer({
      ...viteConfig.default,
      configFile: false,
      customLogger: {
        ...viteLogger,
        error: (msg, options) => {
          viteLogger.error(msg, options);
          console.error("Vite error:", msg);
        },
      },
      server: serverOptions,
      appType: "custom",
    });

    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        const clientTemplate = path.resolve(
          __dirname,
          "..",
          "client",
          "index.html",
        );

        // always reload the index.html file from disk incase it changes
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`,
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } catch (error) {
    console.error("Vite setup error:", error);
    throw new Error("Failed to setup Vite development server. This is expected in production.");
  }
}

export function serveStatic(app: Express) {
  try {
    const distPath = path.resolve(__dirname, "public");

    if (!fs.existsSync(distPath)) {
      log(`UYARI: Build klasörü bulunamadı: ${distPath}`);
      
      // Fallback middleware, 404 sayısını azaltmak için
      app.use(express.static(path.resolve(__dirname, "..", "public")));
      app.use("*", (_req, res) => {
        res.status(404).send("Not found - Build directory is missing");
      });
      return;
    }

    log(`Statik dosyalar sunuluyor: ${distPath}`);
    app.use(express.static(distPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } catch (error) {
    console.error("Static serving error:", error);
    
    // En basit fallback
    app.use("*", (_req, res) => {
      res.status(500).send("Server configuration error");
    });
  }
}
