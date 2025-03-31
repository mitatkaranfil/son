import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import session from "express-session";
import passport from "passport";
import { registerRoutes } from "./routes.ts";
import { registerViteDevServer, serveStatic } from "./vite.ts";
import { authRoutes, createAdminUser } from "./auth.ts";
import { log, setupDatabase } from "./db.ts"; // initializeDatabase yerine setupDatabase kullanıyoruz
import path from "path";
import { fileURLToPath } from "url";

// ESM için dosya yolu alımı
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// İlk admin kullanıcısını oluştur
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || "8000260089"; // Admin Telegram ID güncellendi

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "cosmo-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 gün
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "lax" : "none",
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Auth routes
app.use("/api/auth", authRoutes);

// Korumalı rotalar için middleware
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

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

// Ana sayfa yönlendirme
app.get('/', (req: Request, res: Response) => {
  // Kullanıcı oturum açmışsa dashboard'a, değilse login sayfasına yönlendir
  if (req.isAuthenticated()) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Dashboard yönlendirme
app.get('/dashboard', isAuthenticated, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'client-dist', 'index.html'));
});

// Login sayfası
app.get('/login', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'client-dist', 'index.html'));
});

// Telegram yönlendirme
app.get('/telegram', (req: Request, res: Response) => {
  res.redirect('/login');
});

// API rotaları
app.use('/api', isAuthenticated);

async function startServer() {
  console.log('Using in-memory storage for development');
  
  try {
    // Veritabanını başlat - setupDatabase kullanıyoruz
    const dbInitialized = await setupDatabase();
    if (!dbInitialized) {
      throw new Error('Veritabanı başlatılamadı');
    }

    // İlk admin kullanıcısını oluştur
    const adminUser = await createAdminUser(ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_TELEGRAM_ID);
    if (adminUser) {
      log('Admin kullanıcısı başarıyla oluşturuldu');
    } else {
      log('Admin kullanıcısı oluşturulamadı');
    }

    // Vite veya statik dosya sunucusu kur
    if (process.env.NODE_ENV !== "production") {
      try {
        await registerViteDevServer(app);
      } catch (error) {
        console.error("Vite server başlatılamadı, statik dosya sunucusuna geçiliyor:", error);
        serveStatic(app);
      }
    } else {
      // Üretim ortamında statik dosyaları sun
      serveStatic(app);
    }

    // API rotalarını kaydet
    const server = await registerRoutes(app);

    // Sunucuyu başlat
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`[express] serving on port ${port}`);
    });
  } catch (error) {
    log(`Sunucu başlatılamadı: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});