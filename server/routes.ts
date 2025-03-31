import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.ts";
import { 
  insertUserSchema, 
  insertTaskSchema, 
  insertUserTaskSchema,
  insertBoostTypeSchema,
  insertUserBoostSchema,
  insertReferralSchema
} from "../shared/schema.ts";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { nanoid } from "nanoid";
import { isAdmin } from "./auth.ts";

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();
  const httpServer = createServer(app);

  // Genel middleware - Zod doğrulama hatalarını yakala
  router.use((req: Request, res: Response, next) => {
    res.locals.handleZodError = (error: ZodError) => {
      const validationError = fromZodError(error);
      console.error("Validation error:", validationError.toString());
      return res.status(400).json({
        message: "Validation error",
        errors: validationError.details,
      });
    };
    next();
  });

  // Validation middleware
  const validateRequest = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.locals.handleZodError(error);
      }
      return res.status(400).json({ message: "Invalid request data" });
    }
  };

  // Telegram API - Status kontrolü
  router.get("/telegram/check", async (req: Request, res: Response) => {
    try {
      console.log("Telegram API status check");
      return res.json({ status: "ok", message: "Telegram API is working" });
    } catch (error: any) {
      console.error("Error in Telegram status check:", error?.message || error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Telegram API - Kullanıcı kimlik doğrulama ve oluşturma
  router.get("/telegram/user/:telegramId", async (req: Request, res: Response) => {
    try {
      const { telegramId } = req.params;
      console.log("Telegram user request for:", telegramId);
      
      if (!telegramId) {
        return res.status(400).json({ message: "telegramId is required" });
      }
      
      const user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.json(user);
    } catch (error: any) {
      console.error("Error getting user by telegramId:", error?.message || error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  router.post("/telegram/user", async (req: Request, res: Response) => {
    try {
      const userData = req.body;
      console.log("Creating Telegram user:", userData);
      
      try {
        const validData = insertUserSchema.parse(userData);
        
        // Referral kodu oluştur
        if (!validData.referralCode) {
          validData.referralCode = nanoid(6);
        }
        
        const newUser = await storage.createUser(validData);
        
        // Referral işlemini yap
        if (validData.referredBy) {
          try {
            const referrers = await storage.getUsersByReferralCode(validData.referredBy);
            if (referrers.length > 0) {
              const referrer = referrers[0];
              // Referral oluştur - her iki kullanıcıya da puan ekleyecek
              await storage.createReferral({
                referrerId: referrer.id,
                referredId: newUser.id,
                points: 100 // Varsayılan referral puanı
              });
            }
          } catch (referralError) {
            console.error("Error processing referral:", referralError);
            // Referral işlemi başarısız olsa bile kullanıcı oluşturmaya devam et
          }
        }
        
        return res.status(201).json(newUser);
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          return res.locals.handleZodError(validationError);
        }
        throw validationError;
      }
    } catch (error: any) {
      console.error("Error creating user:", error?.message || error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Kullanıcı API rotaları
  router.get("/users/telegram/:telegramId", async (req: Request, res: Response) => {
    try {
      const telegramId = req.params.telegramId;
      if (!telegramId) {
        return res.status(400).json({ message: "telegramId is required" });
      }
      
      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.json(user);
    } catch (error: any) {
      console.error("Error fetching user by telegramId:", error?.message);
      return res.status(500).json({ message: "Error fetching user" });
    }
  });
  
  // Yeni kullanıcı oluştur - Telegram entegrasyonu için gerekli
  router.post("/users", validateRequest(insertUserSchema), async (req, res) => {
    try {
      const telegramId = req.body.telegramId;
      // Check if user already exists
      const existingUser = await storage.getUserByTelegramId(telegramId);
      if (existingUser) {
        return res.json(existingUser);
      }
      
      // Create new user
      const user = await storage.createUser({
        ...req.body
      });
      
      // Handle referred_by if present
      if (req.body.referredBy) {
        const referrers = await storage.getUsersByReferralCode(req.body.referredBy);
        if (referrers.length > 0) {
          const referrer = referrers[0];
          // Create referral record
          await storage.createReferral({
            referrerId: referrer.id,
            referredId: user.id,
            points: 100
          });
        }
      }
      
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Error creating user" });
    }
  });

  // KORUNMUŞ API ROTALARI - Giriş yapmış kullanıcılar için

  // ADMIN API ROTALARI - Sadece admin kullanıcılar için
  router.get("/admin/users", isAdmin, async (req, res) => {
    try {
      // Tüm kullanıcıları getir
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Error fetching users" });
    }
  });
  
  // Diğer admin rotaları...
  
  // Mount the router
  app.use("/api", router);
  
  return httpServer;
}

