import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { storage } from './storage.ts';
import { User } from '@shared/schema';
import { z } from "zod";
import session from "express-session";

// Local Strategy ile kimlik doğrulama
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      // Kullanıcı adına göre admin kullanıcıyı bul
      const user = await storage.getUserByUsername(username);
      
      // Kullanıcı bulunamadı veya admin değil
      if (!user || user.role !== 'admin' || !user.password) {
        return done(null, false, { message: 'Geçersiz kullanıcı adı veya şifre' });
      }
      
      // Şifreleri karşılaştır
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return done(null, false, { message: 'Geçersiz kullanıcı adı veya şifre' });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

// Serileştirme ve deserileştirme işlemleri
passport.serializeUser((user: User, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUserById(id);
    done(null, user || undefined);
  } catch (error) {
    done(error);
  }
});

// Kimlik doğrulama rotaları
export const authRoutes = express.Router();

// Giriş işlemi
authRoutes.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: 'Sunucu hatası' });
    }
    
    if (!user) {
      return res.status(401).json({ message: info.message || 'Giriş başarısız' });
    }
    
    req.login(user, (loginErr) => {
      if (loginErr) {
        return res.status(500).json({ message: 'Oturum başlatılamadı' });
      }
      
      // Hassas bilgileri filtrele
      const { password, ...userData } = user;
      
      return res.json({
        message: 'Giriş başarılı',
        user: userData
      });
    });
  })(req, res, next);
});

// Çıkış işlemi
authRoutes.post('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) { 
      return res.status(500).json({ message: 'Çıkış yapılırken hata oluştu' });
    }
    res.json({ message: 'Çıkış yapıldı' });
  });
});

// Mevcut kullanıcı bilgilerini getir
authRoutes.get('/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Oturum açık değil' });
  }
  
  // Hassas bilgileri filtrele
  const { password, ...userData } = req.user as User;
  
  res.json(userData);
});

// Yönetici erişimi kontrolü için middleware
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Giriş yapmanız gerekiyor' });
  }
  
  const user = req.user as User;
  
  if (user.role !== 'admin') {
    return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
  }
  
  next();
}

// Admin kullanıcı oluşturma
export async function createAdminUser(username: string, password: string, telegramId: string) {
  try {
    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Kullanıcı adına göre kullanıcıyı kontrol et
    const existingUser = await storage.getUserByUsername(username);
    
    if (existingUser) {
      throw new Error(`"${username}" kullanıcı adı zaten kullanılıyor`);
    }
    
    // Telegram ID'ye göre kullanıcıyı kontrol et
    const existingTelegramUser = await storage.getUserByTelegramId(telegramId);
    
    if (existingTelegramUser) {
      // Mevcut kullanıcıyı admin yap
      return await storage.updateUserRole(existingTelegramUser.id, 'admin', username, hashedPassword);
    }
    
    // Yeni admin kullanıcısı oluştur
    return await storage.createUser({
      telegramId,
      firstName: username,
      lastName: 'Admin',
      username,
      password: hashedPassword,
      referralCode: `ADMIN-${Math.random().toString(36).substring(2, 8)}`,
      role: 'admin'
    });
  } catch (error) {
    console.error('Admin kullanıcı oluşturma hatası:', error);
    throw error;
  }
} 