import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
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

// Vite'ı dinamik olarak yüklemek için yardımcı fonksiyon
async function loadVite() {
  try {
    // Üretim ortamında çalışıyorsak, bu modülü yüklemeyi denemek yerine hata döndür
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Vite is not available in production mode');
    }
    
    const viteModule = await import('vite');
    return {
      createViteServer: viteModule.createServer,
      createLogger: viteModule.createLogger
    };
  } catch (error) {
    console.error('Failed to import Vite:', error);
    throw new Error('Failed to import Vite. Make sure it is installed in development dependencies.');
  }
}

export async function setupVite(app: Express, server: Server) {
  try {
    // Sadece geliştirme ortamında vite kullan
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Vite development server is not available in production');
    }
    
    // Dinamik olarak vite ve viteConfig import edilir
    const { createViteServer, createLogger } = await loadVite();
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
    const distPath = path.resolve(__dirname, "..", "client-dist");

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

// Vite development server'ı kaydet
export async function registerViteDevServer(app: Express): Promise<void> {
  // Üretim ortamında Vite'ı yüklemeye çalışma
  if (process.env.NODE_ENV === 'production') {
    log('Production mode: Skipping Vite development server');
    serveStatic(app);
    return;
  }
  
  try {
    log("Vite development server başlatılıyor");
    const { createViteServer } = await loadVite();
    
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });

    app.use(vite.middlewares);

    // Diğer rotaları işlemek için catch-all middleware
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        // Proje kök dizinine göre istemci index.html yolunu belirle
        const clientRoot = path.resolve(__dirname, "..", "client");
        const indexPath = path.join(clientRoot, "index.html");

        if (!fs.existsSync(indexPath)) {
          return next(new Error(`index.html not found: ${indexPath}`));
        }

        // index.html dosyasını oku
        let template = fs.readFileSync(indexPath, "utf-8");
        
        // Vite transformation
        template = await vite.transformIndexHtml(url, template);
        
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });

    log("Vite development server başarıyla başlatıldı");
  } catch (error) {
    console.error("Vite setup error:", error);
    log("Vite development server başlatılamadı, statik dosyalar kullanılacak");
    
    // Başarısız olursa statik sunucuya düş
    serveStatic(app);
  }
}
