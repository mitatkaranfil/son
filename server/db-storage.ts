import { eq, and } from "drizzle-orm";
import { supabase, log } from "./db.ts";
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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegramId', telegramId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getUserByTelegramId error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getUserByUsername error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`createUser error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async updateUserPoints(userId: number, pointsToAdd: number): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return false;
      
      const { error } = await supabase
        .from('users')
        .update({ points: user.points + pointsToAdd })
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      log(`updateUserPoints error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  async updateUserLastMiningTime(userId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ lastMiningTime: new Date() })
        .eq('id', userId);

      if (error) throw error;
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
      
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`updateUserRole error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async getUserById(userId: number): Promise<User | undefined> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getUserById error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async getUsersByReferralCode(referralCode: string): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('referralCode', referralCode);

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getUsersByReferralCode error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getAllUsers error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  // Task methods
  async getTasks(type?: string): Promise<Task[]> {
    try {
      if (type) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('type', type as "daily" | "weekly" | "special")
          .eq('isActive', true);

        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('isActive', true);

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getTasks error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  async getTaskById(id: number): Promise<Task | undefined> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getTaskById error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async createTask(taskData: InsertTask): Promise<Task> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`createTask error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`updateTask error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async deleteTask(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
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
      const userTasksResult = await supabase
        .from('userTasks')
        .select('*')
        .eq('userId', userId);

      const result: (UserTask & { task: Task })[] = [];
      
      for (const userTask of userTasksResult.data) {
        const taskResult = await supabase
          .from('tasks')
          .select('*')
          .eq('id', userTask.taskId)
          .single();

        if (taskResult.data) {
          result.push({
            ...userTask,
            task: taskResult.data
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
      const { data, error } = await supabase
        .from('userBoosts')
        .insert([userBoost])
        .select()
        .single();

      if (error) throw error;
      const boostTypeResult = await supabase
        .from('boostTypes')
        .select('*')
        .eq('id', userBoost.boostTypeId)
        .single();

      if (boostTypeResult.data) {
        return {
          ...data,
          boostType: boostTypeResult.data
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
      const referralsResult = await supabase
        .from('referrals')
        .select('*')
        .eq('referrerId', referrerId);

      const result: (Referral & { referredUser: User })[] = [];
      
      for (const referral of referralsResult.data) {
        const userResult = await supabase
          .from('users')
          .select('*')
          .eq('id', referral.referredId)
          .single();

        if (userResult.data) {
          result.push({
            ...referral,
            referredUser: userResult.data
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