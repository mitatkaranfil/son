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

// Supabase veritabanına bağlanan IStorage implementasyonu
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
      // Convert camelCase to snake_case
      // Sadece veritabanında bulunan alanları gönder
      const user = {
        telegram_id: userData.telegramId,
        firstname: userData.firstname,
        lastname: userData.lastname,
        username: userData.username,
        referral_code: userData.referralCode,
        role: userData.role,
        password: userData.password,
        last_mining_time: new Date().toISOString(),
        points: 0
      };

      const { data, error } = await supabase
        .from('users')
        .insert([user])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`createUser error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
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
          last_mining_time: new Date().toISOString()
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
        .update({ last_mining_time: new Date().toISOString() })
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
        .eq('referral_code', referralCode);  // snake_case olarak düzeltildi

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
          .eq('is_active', true);  // isActive -> is_active olarak düzeltildi

        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true);  // isActive -> is_active olarak düzeltildi

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
  
  // UserTask methods
  async getUserTasks(userId: number): Promise<(UserTask & { task: Task })[]> {
    try {
      const { data, error } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      
      // Her user_task için ilgili task bilgilerini getir
      const tasks = await Promise.all(
        data.map(async (userTask) => {
          const { data: taskData, error: taskError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', userTask.task_id)
            .single();

          if (taskError) throw taskError;
          return { ...userTask, task: taskData };
        })
      );

      return tasks;
    } catch (error) {
      log(`getUserTasks error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  async getUserTaskById(userId: number, taskId: number): Promise<UserTask | undefined> {
    try {
      const { data, error } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('task_id', taskId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getUserTaskById error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async createUserTask(userTask: InsertUserTask): Promise<UserTask> {
    try {
      const { data, error } = await supabase
        .from('user_tasks')
        .insert([userTask])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`createUserTask error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      throw error;
    }
  }
  
  async updateUserTask(userId: number, taskId: number, progress: number, isCompleted: boolean): Promise<UserTask> {
    try {
      const { data, error } = await supabase
        .from('user_tasks')
        .update({
          progress,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('user_id', userId)
        .eq('task_id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`updateUserTask error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async updateUserTaskProgress(userId: number, taskId: number, progress: number): Promise<UserTask | undefined> {
    try {
      const { data, error } = await supabase
        .from('user_tasks')
        .update({ progress })
        .eq('user_id', userId)
        .eq('task_id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`updateUserTaskProgress error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      return undefined;
    }
  }

  async completeUserTask(userId: number, taskId: number): Promise<UserTask | undefined> {
    try {
      const { data, error } = await supabase
        .from('user_tasks')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('task_id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`completeUserTask error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      return undefined;
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
  
  async getBoostTypeById(id: number): Promise<BoostType | undefined> {
    try {
      const { data, error } = await supabase
        .from('boost_types')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getBoostTypeById error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async createBoostType(boostType: InsertBoostType): Promise<BoostType> {
    try {
      const { data, error } = await supabase
        .from('boost_types')
        .insert([{
          name: boostType.name,
          description: boostType.description,
          multiplier: boostType.multiplier,
          duration_hours: boostType.durationHours,
          cost: boostType.cost,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`createBoostType error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to create boost type: ${error}`);
    }
  }
  
  async updateBoostType(id: number, boostType: Partial<BoostType>): Promise<BoostType | undefined> {
    try {
      const { data, error } = await supabase
        .from('boost_types')
        .update(boostType)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`updateBoostType error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      return undefined;
    }
  }

  async deleteBoostType(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('boost_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      log(`deleteBoostType error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      return false;
    }
  }
  
  // UserBoost methods
  async getUserBoosts(userId: number): Promise<(UserBoost & { boost_type: BoostType })[]> {
    try {
      const { data, error } = await supabase
        .from('user_boosts')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      
      // Her user_boost için ilgili boost_type bilgilerini getir
      const boostTypes = await Promise.all(
        data.map(async (userBoost) => {
          const { data: boostTypeData, error: boostTypeError } = await supabase
            .from('boost_types')
            .select('*')
            .eq('id', userBoost.boost_type_id)
            .single();

          if (boostTypeError) throw boostTypeError;
          return { ...userBoost, boost_type: boostTypeData };
        })
      );

      return boostTypes;
    } catch (error) {
      log(`getUserBoosts error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  async createUserBoost(userBoost: InsertUserBoost): Promise<UserBoost & { boost_type: BoostType }> {
    try {
      const { data, error } = await supabase
        .from('user_boosts')
        .insert([userBoost])
        .select('*')
        .single();

      if (error) throw error;
      
      // Get related boost type
      const { data: boostType, error: boostError } = await supabase
        .from('boost_types')
        .select('*')
        .eq('id', data.boost_type_id)
        .single();

      if (boostError) throw boostError;
      
      return {
        ...data,
        boost_type: boostType
      };
    } catch (error) {
      log(`createUserBoost error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      throw error;
    }
  }
  
  async updateUserBoost(userId: number, boostTypeId: number, isActive: boolean): Promise<UserBoost> {
    try {
      const { data, error } = await supabase
        .from('user_boosts')
        .update({
          is_active: isActive
        })
        .eq('user_id', userId)
        .eq('boost_type_id', boostTypeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`updateUserBoost error: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  
  async deactivateExpiredBoosts(): Promise<number> {
    try {
      const now = new Date().toISOString();
      const { error, count } = await supabase
        .from('user_boosts')
        .update({ is_active: false })
        .eq('is_active', true)
        .lt('end_time', now)
        .select('id', { count: 'exact' });

      if (error) throw error;
      return count || 0;
    } catch (error) {
      log(`deactivateExpiredBoosts error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      return 0;
    }
  }
  
  async getUserActiveBoosts(userId: number): Promise<(UserBoost & { boost_type: BoostType })[]> {
    try {
      const { data, error } = await supabase
        .from('user_boosts')
        .select('*, boost_types(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('end_time', new Date().toISOString());

      if (error) throw error;
      return data || [];
    } catch (error) {
      log(`getUserActiveBoosts error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      return [];
    }
  }

  async getReferrals(referrerId: number): Promise<(Referral & { referred_user: User })[]> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*, referred_user:users(*)')
        .eq('referrer_id', referrerId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      log(`getReferrals error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      return [];
    }
  }

  async getReferralCount(userId: number): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', userId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      log(`getReferralCount error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      return 0;
    }
  }
  
  // Referral methods
  async createReferral(referral: InsertReferral): Promise<Referral> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .insert([{
          referrer_id: referral.referrer_id,
          referred_id: referral.referred_id,
          points: referral.points || 0,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      log(`createReferral error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to create referral: ${error}`);
    }
  }
  
  async getReferralsByReferrer(referrerId: number): Promise<Referral[]> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', referrerId);

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getReferralsByReferrer error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  async getReferralsByReferred(referredId: number): Promise<Referral[]> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_id', referredId);

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getReferralsByReferred error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  async getBoosts(): Promise<BoostType[]> {
    try {
      const { data, error } = await supabase
        .from('boost_types')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data;
    } catch (error) {
      log(`getBoosts error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}