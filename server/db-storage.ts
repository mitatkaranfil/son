import { eq, and } from "drizzle-orm";
import { db, log } from "./db.ts";
import {
  users, User, InsertUser,
  tasks, Task, InsertTask,
  userTasks, UserTask, InsertUserTask,
  boostTypes, BoostType, InsertBoostType,
  userBoosts, UserBoost, InsertUserBoost,
  referrals, Referral, InsertReferral
} from "../shared/schema.ts";
import { IStorage } from "./storage.ts";

// Neon.tech PostgreSQL veritabanına bağlanan bir IStorage implementasyonu
export class NeonStorage implements IStorage {
  
  // User methods
  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.telegramId, telegramId));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      log(`getUserByTelegramId error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      log(`getUserByUsername error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    try {
      const result = await db.insert(users).values(userData).returning();
      return result[0];
    } catch (error) {
      log(`createUser error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async updateUserPoints(userId: number, pointsToAdd: number): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return false;
      
      await db.update(users)
        .set({ points: user.points + pointsToAdd })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      log(`updateUserPoints error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  async updateUserLastMiningTime(userId: number): Promise<boolean> {
    try {
      await db.update(users)
        .set({ lastMiningTime: new Date() })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      log(`updateUserLastMiningTime error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  async updateUserRole(userId: number, role: string, username?: string, password?: string): Promise<User | undefined> {
    try {
      const updateData: Partial<User> = { role: role as any };
      
      // Eğer kullanıcı adı varsa güncelle
      if (username) {
        updateData.username = username;
      }
      
      // Eğer şifre varsa güncelle
      if (password) {
        updateData.password = password;
      }
      
      const result = await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();
      
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      log(`updateUserRole error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async getUserById(userId: number): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, userId));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      log(`getUserById error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async getUsersByReferralCode(referralCode: string): Promise<User[]> {
    try {
      return await db.select().from(users).where(eq(users.referralCode, referralCode));
    } catch (error) {
      log(`getUsersByReferralCode error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      log(`getAllUsers error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  // Task methods
  async getTasks(type?: string): Promise<Task[]> {
    try {
      if (type) {
        return await db.select().from(tasks)
          .where(and(eq(tasks.type, type as "daily" | "weekly" | "special"), eq(tasks.isActive, true)));
      }
      return await db.select().from(tasks).where(eq(tasks.isActive, true));
    } catch (error) {
      log(`getTasks error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  async getTaskById(id: number): Promise<Task | undefined> {
    try {
      const result = await db.select().from(tasks).where(eq(tasks.id, id));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      log(`getTaskById error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async createTask(taskData: InsertTask): Promise<Task> {
    try {
      const result = await db.insert(tasks).values(taskData).returning();
      return result[0];
    } catch (error) {
      log(`createTask error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined> {
    try {
      const result = await db.update(tasks)
        .set(taskData)
        .where(eq(tasks.id, id))
        .returning();
      
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      log(`updateTask error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async deleteTask(id: number): Promise<boolean> {
    try {
      const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      log(`deleteTask error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  // UserTask methods - diğer metodları da benzer şekilde implemente edebilirsiniz
  // Özet olması için diğer metodların implementasyonu atlanmıştır
  
  async getUserTasks(userId: number): Promise<(UserTask & { task: Task })[]> {
    // Bu implementasyon örnek olarak eklenmiştir
    try {
      const userTasksResult = await db.select().from(userTasks)
        .where(eq(userTasks.userId, userId));
      
      const result: (UserTask & { task: Task })[] = [];
      
      for (const userTask of userTasksResult) {
        const taskResult = await db.select().from(tasks)
          .where(eq(tasks.id, userTask.taskId));
        
        if (taskResult.length > 0) {
          result.push({
            ...userTask,
            task: taskResult[0]
          });
        }
      }
      
      return result;
    } catch (error) {
      log(`getUserTasks error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  // Diğer tüm metodlar benzer şekilde implemente edilecektir
  // Firebase yerine PostgreSQL kullanacak şekilde
  
  // Burada örnek olarak sadece bazı metodlar implemente edilmiştir
  // Tam implementasyon için tüm IStorage metodlarını uygun şekilde doldurmanız gerekir
  
  async getUserTaskById(userId: number, taskId: number): Promise<UserTask | undefined> {
    // Implementasyon
    return undefined;
  }
  
  async createUserTask(userTask: InsertUserTask): Promise<UserTask> {
    // Implementasyon
    throw new Error("Method not implemented");
  }
  
  async updateUserTaskProgress(userId: number, taskId: number, progress: number): Promise<UserTask | undefined> {
    // Implementasyon
    return undefined;
  }
  
  async completeUserTask(userId: number, taskId: number): Promise<UserTask | undefined> {
    // Implementasyon
    return undefined;
  }
  
  async getBoostTypes(): Promise<BoostType[]> {
    // Implementasyon
    return [];
  }
  
  async getBoostTypeById(id: number): Promise<BoostType | undefined> {
    // Implementasyon
    return undefined;
  }
  
  async createBoostType(boostType: InsertBoostType): Promise<BoostType> {
    // Implementasyon
    throw new Error("Method not implemented");
  }
  
  async updateBoostType(id: number, boostType: Partial<BoostType>): Promise<BoostType | undefined> {
    // Implementasyon
    return undefined;
  }
  
  async deleteBoostType(id: number): Promise<boolean> {
    // Implementasyon
    return false;
  }
  
  async getUserBoosts(userId: number): Promise<(UserBoost & { boostType: BoostType })[]> {
    // Implementasyon
    return [];
  }
  
  async getUserActiveBoosts(userId: number): Promise<(UserBoost & { boostType: BoostType })[]> {
    // Implementasyon
    return [];
  }
  
  async createUserBoost(userBoost: InsertUserBoost): Promise<UserBoost & { boostType: BoostType }> {
    try {
      const result = await db.insert(userBoosts).values(userBoost).returning();
      const boostTypeResult = await db.select().from(boostTypes).where(eq(boostTypes.id, userBoost.boostTypeId));
      
      if (result.length > 0 && boostTypeResult.length > 0) {
        return {
          ...result[0],
          boostType: boostTypeResult[0]
        };
      }
      
      throw new Error("Failed to create user boost");
    } catch (error) {
      log(`createUserBoost error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async deactivateExpiredBoosts(): Promise<number> {
    // Implementasyon
    return 0;
  }
  
  async getReferrals(referrerId: number): Promise<(Referral & { referredUser: User })[]> {
    try {
      const referralsResult = await db.select().from(referrals).where(eq(referrals.referrerId, referrerId));
      const result: (Referral & { referredUser: User })[] = [];
      
      for (const referral of referralsResult) {
        const userResult = await db.select().from(users).where(eq(users.id, referral.referredId));
        
        if (userResult.length > 0) {
          result.push({
            ...referral,
            referredUser: userResult[0]
          });
        }
      }
      
      return result;
    } catch (error) {
      log(`getReferrals error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  async createReferral(referral: InsertReferral): Promise<Referral> {
    // Implementasyon
    throw new Error("Method not implemented");
  }
  
  async getReferralCount(userId: number): Promise<number> {
    // Implementasyon
    return 0;
  }
} 