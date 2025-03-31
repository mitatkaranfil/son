import { eq } from "drizzle-orm";
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

export class SupabaseStorage implements IStorage {
  
  // User methods
  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
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
      const { firstname, lastname, ...restData } = userData;
      
      const { data, error } = await supabase
        .from('users')
        .insert([{
          ...restData,
          first_name: firstname,
          last_name: lastname,
          last_mining_time: new Date(),
          created_at: new Date()
        }])
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
        .update({ 
          points: user.points + pointsToAdd,
          last_mining_time: new Date()
        })
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
        .update({ last_mining_time: new Date() })
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
      
      if (username) {
        updateData.username = username;
      }
      
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
        .eq('referral_code', referralCode);

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
          .eq('is_active', true);

        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getTasks error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
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
  
  async updateTask(taskId: number, taskData: Partial<Task>): Promise<Task | undefined> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`updateTask error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async deleteTask(taskId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      return true;
    } catch (error) {
      log(`deleteTask error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  // UserTask methods
  async createUserTask(userData: InsertUserTask): Promise<UserTask> {
    try {
      const { data, error } = await supabase
        .from('user_tasks')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`createUserTask error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async getUserTasks(userId: number): Promise<UserTask[]> {
    try {
      const { data, error } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getUserTasks error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  async updateUserTask(taskId: number, userData: Partial<UserTask>): Promise<UserTask | undefined> {
    try {
      const { data, error } = await supabase
        .from('user_tasks')
        .update(userData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`updateUserTask error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async deleteUserTask(taskId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      return true;
    } catch (error) {
      log(`deleteUserTask error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  // BoostType methods
  async getBoostTypes(): Promise<BoostType[]> {
    try {
      const { data, error } = await supabase
        .from('boost_types')
        .select('*');

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getBoostTypes error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  async createBoostType(boostData: InsertBoostType): Promise<BoostType> {
    try {
      const { data, error } = await supabase
        .from('boost_types')
        .insert([boostData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`createBoostType error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async updateBoostType(boostId: number, boostData: Partial<BoostType>): Promise<BoostType | undefined> {
    try {
      const { data, error } = await supabase
        .from('boost_types')
        .update(boostData)
        .eq('id', boostId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`updateBoostType error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async deleteBoostType(boostId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('boost_types')
        .delete()
        .eq('id', boostId);

      if (error) throw error;
      return true;
    } catch (error) {
      log(`deleteBoostType error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  // UserBoost methods
  async createUserBoost(userData: InsertUserBoost): Promise<UserBoost> {
    try {
      const { data, error } = await supabase
        .from('user_boosts')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`createUserBoost error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async getUserBoosts(userId: number): Promise<UserBoost[]> {
    try {
      const { data, error } = await supabase
        .from('user_boosts')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getUserBoosts error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  async updateUserBoost(boostId: number, userData: Partial<UserBoost>): Promise<UserBoost | undefined> {
    try {
      const { data, error } = await supabase
        .from('user_boosts')
        .update(userData)
        .eq('id', boostId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`updateUserBoost error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async deleteUserBoost(boostId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_boosts')
        .delete()
        .eq('id', boostId);

      if (error) throw error;
      return true;
    } catch (error) {
      log(`deleteUserBoost error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  // Referral methods
  async createReferral(referralData: InsertReferral): Promise<Referral> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .insert([referralData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`createReferral error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  async getReferrals(userId: number): Promise<Referral[]> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', userId);

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getReferrals error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  async updateReferral(referralId: number, referralData: Partial<Referral>): Promise<Referral | undefined> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .update(referralData)
        .eq('id', referralId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`updateReferral error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async deleteReferral(referralId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('referrals')
        .delete()
        .eq('id', referralId);

      if (error) throw error;
      return true;
    } catch (error) {
      log(`deleteReferral error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}