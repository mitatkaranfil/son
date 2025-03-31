import express, { type Express, Request, Response } from "express";
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
  
  // Middleware to handle Zod validation errors
  const validateRequest = (schema: any) => (req: Request, res: Response, next: Function) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(400).json({ message: "Invalid request data" });
      }
    }
  };

  // TELEGRAM ENDPOINTS - Telegram Mini App için özel API
  router.get("/telegram/user/:telegramId", async (req, res) => {
    try {
      const { telegramId } = req.params;
      const user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        return res.status(404).json({ 
          message: "User not found",
          telegramId
        });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user by telegramId:", error);
      res.status(500).json({ 
        message: "Error fetching user",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Yeni Telegram kullanıcısı oluştur
  router.post("/telegram/user", validateRequest(insertUserSchema), async (req, res) => {
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
      res.status(500).json({ 
        message: "Error creating user",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Telegram entegrasyonu test endpoint
  router.get("/telegram/check", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Telegram API endpoint is working", 
      timestamp: new Date().toISOString() 
    });
  });

  // GENEL API ROTALARI - Kimlik doğrulama gerektirmeyen rotalar

  // Telegram ID'ye göre kullanıcı getir - Telegram entegrasyonu için gerekli
  router.get("/users/telegram/:telegramId", async (req, res) => {
    try {
      const { telegramId } = req.params;
      const user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user by telegramId:", error);
      res.status(500).json({ message: "Error fetching user" });
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
  
  const httpServer = createServer(app);
  return httpServer;
}

