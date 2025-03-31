import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { log } from "./vite";

// Uncaught hataları yakala
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Hata logla ama işlemi sonlandırma
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Hata logla ama işlemi sonlandırma
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Sağlık kontrolü endpoint'i ekle
app.get("/health", (_req, res) => {
  res.status(200).send({ status: "OK", timestamp: new Date().toISOString() });
});

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error("App error:", err);
    });

    // Dinamik olarak geliştirme/üretim moduna göre uygun modülleri yükleyelim
    if (app.get("env") === "development") {
      try {
        // Sadece development modunda vite modülünü yükle
        const { setupVite } = await import("./vite");
        await setupVite(app, server);
        log("Vite development server başarıyla kuruldu");
      } catch (error) {
        console.error("Vite server setup error:", error);
        log("DEV: Vite sunucusu kurulamadı, statik dosyalara düşülüyor");
        await loadStaticServer(app);
      }
    } else {
      // Üretim ortamında sadece statik dosyaları sun
      await loadStaticServer(app);
    }

    // Use environment variable PORT or default to 3000
    const port = process.env.PORT || 3000;
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`serving on port ${port}`);
    });

    // Health check log
    setInterval(() => {
      console.log(`[HEALTH] Server running on port ${port}, time: ${new Date().toISOString()}`);
    }, 60000); // Her dakika
  } catch (error) {
    console.error("Server startup error:", error);
  }
})();

// Statik sunucu yükleme fonksiyonu - vite modülünü lazily load eder
async function loadStaticServer(app: express.Express) {
  try {
    const { serveStatic } = await import("./vite");
    serveStatic(app);
    log("Static server başarıyla kuruldu");
  } catch (error) {
    console.error("Static server setup error:", error);
    
    // En basit fallback
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const { dirname } = await import("path");
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    const staticPath = path.resolve(__dirname, "public");
    log(`Fallback static server, serving from: ${staticPath}`);
    
    app.use(express.static(staticPath));
    app.use("*", (_req, res) => {
      res.status(200).send("Application is running in fallback mode");
    });
  }
}
