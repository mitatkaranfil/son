// Gerekli arayüzleri ve türleri içe aktar
import {
  User, InsertUser,
  Task, InsertTask,
  UserTask, InsertUserTask,
  BoostType, InsertBoostType,
  UserBoost, InsertUserBoost,
  Referral, InsertReferral
} from "../shared/schema.ts";

// Storage arayüzü tanımla
export interface IStorage {
  // User methods
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(userData: InsertUser): Promise<User>;
  updateUserPoints(userId: number, pointsToAdd: number): Promise<boolean>;
  updateUserLastMiningTime(userId: number): Promise<boolean>;
  updateUserRole(userId: number, role: string, username?: string, password?: string): Promise<User | undefined>;
  getUserById(userId: number): Promise<User | undefined>;
  getUsersByReferralCode(referralCode: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  
  // Task methods
  getTasks(type?: string): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  createTask(taskData: InsertTask): Promise<Task>;
  updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // UserTask methods
  getUserTasks(userId: number): Promise<(UserTask & { task: Task })[]>;
  getUserTaskById(userId: number, taskId: number): Promise<UserTask | undefined>;
  createUserTask(userTask: InsertUserTask): Promise<UserTask>;
  updateUserTaskProgress(userId: number, taskId: number, progress: number): Promise<UserTask | undefined>;
  completeUserTask(userId: number, taskId: number): Promise<UserTask | undefined>;
  
  // BoostType methods
  getBoostTypes(): Promise<BoostType[]>;
  getBoostTypeById(id: number): Promise<BoostType | undefined>;
  createBoostType(boostType: InsertBoostType): Promise<BoostType>;
  updateBoostType(id: number, boostType: Partial<BoostType>): Promise<BoostType | undefined>;
  deleteBoostType(id: number): Promise<boolean>;
  
  // UserBoost methods
  getUserBoosts(userId: number): Promise<(UserBoost & { boost_type: BoostType })[]>;
  getUserActiveBoosts(userId: number): Promise<(UserBoost & { boost_type: BoostType })[]>;
  createUserBoost(userBoost: InsertUserBoost): Promise<UserBoost & { boost_type: BoostType }>;
  deactivateExpiredBoosts(): Promise<number>;
  
  // Referral methods
  getReferrals(referrerId: number): Promise<(Referral & { referred_user: User })[]>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralCount(userId: number): Promise<number>;
}

// SupabaseStorage sınıfını içe aktar
import { SupabaseStorage } from './db-storage.ts';

// Bellekte saklama için örnek bir sınıf
export class InMemoryStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private tasks: Map<number, Task> = new Map();
  private userTasks: Map<string, UserTask> = new Map(); // key: `${user_id}-${task_id}`
  private boostTypes: Map<number, BoostType> = new Map();
  private userBoosts: Map<number, UserBoost> = new Map();
  private referrals: Map<number, Referral> = new Map();
  
  private userIdCounter = 1;
  private taskIdCounter = 1;
  private userTaskIdCounter = 1;
  private boostTypeIdCounter = 1;
  private userBoostIdCounter = 1;
  private referralIdCounter = 1;
  
  constructor() {
    // Initialize with some default data
    this.initializeDefaultData();
  }
  
  private initializeDefaultData() {
    // Add default boost types
    this.createBoostType({
      name: "Hız Boost",
      description: "Kazım hızını 24 saat boyunca 1.5x artır",
      multiplier: 150, // 1.5x
      duration_hours: 24,
      price: 500,
      is_active: true,
      icon_name: "rocket",
      color_class: "blue",
      is_popular: false
    });
    
    this.createBoostType({
      name: "Süper Boost",
      description: "Kazım hızını 24 saat boyunca 2x artır",
      multiplier: 200, // 2x
      duration_hours: 24,
      price: 1000,
      is_active: true,
      icon_name: "rocket",
      color_class: "purple",
      is_popular: false
    });
    
    this.createBoostType({
      name: "Mega Boost",
      description: "Kazım hızını 24 saat boyunca 3x artır",
      multiplier: 300, // 3x
      duration_hours: 24,
      price: 2000,
      is_active: true,
      icon_name: "rocket",
      color_class: "yellow",
      is_popular: false
    });
    
    this.createBoostType({
      name: "Ultra Boost",
      description: "Kazım hızını 7 gün boyunca 2x artır",
      multiplier: 200, // 2x
      duration_hours: 168, // 7 days
      price: 5000,
      is_active: true,
      icon_name: "rocket",
      color_class: "red",
      is_popular: true
    });
    
    // Add default tasks
    this.createTask({
      type: "daily",
      title: "Uygulamayı Aç",
      description: "Uygulamayı günde bir kez aç",
      points: 10,
      required_amount: 1,
      is_active: true,
      telegram_action: "open_app",
      telegram_target: null
    });
    
    this.createTask({
      type: "daily",
      title: "Gruba Mesaj Gönder",
      description: "Telegram grubuna en az 3 mesaj gönder",
      points: 50,
      required_amount: 3,
      is_active: true,
      telegram_action: "send_message",
      telegram_target: "@mining_group"
    });
    
    this.createTask({
      type: "weekly",
      title: "5 Arkadaş Davet Et",
      description: "5 arkadaşını referans koduyla davet et",
      points: 200,
      required_amount: 5,
      is_active: true,
      telegram_action: "invite_friends",
      telegram_target: null
    });
    
    this.createTask({
      type: "special",
      title: "Kanala Katıl",
      description: "Resmi duyuru kanalımıza katıl",
      points: 100,
      required_amount: 1,
      is_active: true,
      telegram_action: "join_channel",
      telegram_target: "@mining_channel"
    });
  }
  
  // User methods
  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(u => u.telegram_id === telegramId);
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(u => u.username === username);
    return user;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = {
      ...userData,
      id,
      level: 1,
      points: 0,
      mining_speed: 10,
      last_mining_time: new Date(),
      completed_tasks_count: 0,
      boost_usage_count: 0,
      join_date: new Date()
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUserPoints(userId: number, pointsToAdd: number): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    const updatedUser = {
      ...user,
      points: user.points + pointsToAdd
    };
    
    this.users.set(userId, updatedUser);
    return true;
  }
  
  async updateUserLastMiningTime(userId: number): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    const updatedUser = {
      ...user,
      last_mining_time: new Date()
    };
    
    this.users.set(userId, updatedUser);
    return true;
  }
  
  async updateUserRole(userId: number, role: string, username?: string, password?: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      role,
      username,
      password
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async getUserById(userId: number): Promise<User | undefined> {
    return this.users.get(userId);
  }
  
  async getUsersByReferralCode(referralCode: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.referral_code === referralCode);
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Task methods
  async getTasks(type?: string): Promise<Task[]> {
    const allTasks = Array.from(this.tasks.values());
    if (type) {
      return allTasks.filter(task => task.type === type && task.is_active);
    }
    return allTasks.filter(task => task.is_active);
  }
  
  async getTaskById(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }
  
  async createTask(taskData: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const task: Task = {
      ...taskData,
      id
    };
    
    this.tasks.set(id, task);
    return task;
  }
  
  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = {
      ...task,
      ...taskData
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }
  
  // UserTask methods
  async getUserTasks(userId: number): Promise<(UserTask & { task: Task })[]> {
    const userTaskEntries = Array.from(this.userTasks.values())
      .filter(ut => ut.user_id === userId);
    
    return userTaskEntries.map(ut => {
      const task = this.tasks.get(ut.task_id)!;
      return { ...ut, task };
    });
  }
  
  async getUserTaskById(userId: number, taskId: number): Promise<UserTask | undefined> {
    return this.userTasks.get(`${userId}-${taskId}`);
  }
  
  async createUserTask(userTask: InsertUserTask): Promise<UserTask> {
    const id = this.userTaskIdCounter++;
    const userTaskData: UserTask = {
      ...userTask,
      id,
      progress: 0,
      is_completed: false,
      completed_at: null,
      created_at: new Date()
    };
    
    this.userTasks.set(`${userTask.user_id}-${userTask.task_id}`, userTaskData);
    return userTaskData;
  }
  
  async updateUserTaskProgress(userId: number, taskId: number, progress: number): Promise<UserTask | undefined> {
    const key = `${userId}-${taskId}`;
    const userTask = this.userTasks.get(key);
    if (!userTask) return undefined;
    
    const task = this.tasks.get(taskId);
    if (!task) return undefined;
    
    const isCompleted = progress >= task.required_amount;
    const completedAt = isCompleted ? new Date() : userTask.completed_at;
    
    const updatedUserTask: UserTask = {
      ...userTask,
      progress,
      is_completed: isCompleted,
      completed_at: completedAt
    };
    
    this.userTasks.set(key, updatedUserTask);
    
    // If task was just completed, update user stats
    if (isCompleted && !userTask.is_completed) {
      const user = this.users.get(userId);
      if (user) {
        const updatedUser = {
          ...user,
          points: user.points + task.points,
          completed_tasks_count: user.completed_tasks_count + 1
        };
        this.users.set(userId, updatedUser);
      }
    }
    
    return updatedUserTask;
  }
  
  async completeUserTask(userId: number, taskId: number): Promise<UserTask | undefined> {
    const key = `${userId}-${taskId}`;
    const userTask = this.userTasks.get(key);
    if (!userTask) return undefined;
    
    const task = this.tasks.get(taskId);
    if (!task) return undefined;
    
    const updatedUserTask: UserTask = {
      ...userTask,
      progress: task.required_amount,
      is_completed: true,
      completed_at: new Date()
    };
    
    this.userTasks.set(key, updatedUserTask);
    
    // Update user points and stats
    if (!userTask.is_completed) {
      const user = this.users.get(userId);
      if (user) {
        const updatedUser = {
          ...user,
          points: user.points + task.points,
          completed_tasks_count: user.completed_tasks_count + 1
        };
        this.users.set(userId, updatedUser);
      }
    }
    
    return updatedUserTask;
  }
  
  // BoostType methods
  async getBoostTypes(): Promise<BoostType[]> {
    return Array.from(this.boostTypes.values()).filter(bt => bt.is_active);
  }
  
  async getBoostTypeById(id: number): Promise<BoostType | undefined> {
    return this.boostTypes.get(id);
  }
  
  async createBoostType(boostType: InsertBoostType): Promise<BoostType> {
    const id = this.boostTypeIdCounter++;
    const boostTypeData: BoostType = {
      ...boostType,
      id
    };
    
    this.boostTypes.set(id, boostTypeData);
    return boostTypeData;
  }
  
  async updateBoostType(id: number, boostType: Partial<BoostType>): Promise<BoostType | undefined> {
    const boostTypeData = this.boostTypes.get(id);
    if (!boostTypeData) return undefined;
    
    const updatedBoostType = {
      ...boostTypeData,
      ...boostType
    };
    
    this.boostTypes.set(id, updatedBoostType);
    return updatedBoostType;
  }
  
  async deleteBoostType(id: number): Promise<boolean> {
    return this.boostTypes.delete(id);
  }
  
  // UserBoost methods
  async getUserBoosts(userId: number): Promise<(UserBoost & { boost_type: BoostType })[]> {
    const userBoostEntries = Array.from(this.userBoosts.values())
      .filter(ub => ub.user_id === userId);
    
    return userBoostEntries.map(ub => {
      const boostType = this.boostTypes.get(ub.boost_type_id)!;
      return { ...ub, boost_type };
    });
  }
  
  async getUserActiveBoosts(userId: number): Promise<(UserBoost & { boost_type: BoostType })[]> {
    const now = new Date();
    const userBoostEntries = Array.from(this.userBoosts.values())
      .filter(ub => ub.user_id === userId && ub.is_active && new Date(ub.end_time) > now);
    
    return userBoostEntries.map(ub => {
      const boostType = this.boostTypes.get(ub.boost_type_id)!;
      return { ...ub, boost_type };
    });
  }
  
  async createUserBoost(userBoost: InsertUserBoost): Promise<UserBoost & { boost_type: BoostType }> {
    const id = this.userBoostIdCounter++;
    const start_time = new Date();
    const userBoostData: UserBoost = {
      ...userBoost,
      id,
      start_time,
      is_active: true
    };
    
    this.userBoosts.set(id, userBoostData);
    
    // Update user's boost usage count
    const user = this.users.get(userBoost.user_id);
    if (user) {
      const updatedUser = {
        ...user,
        boost_usage_count: user.boost_usage_count + 1
      };
      this.users.set(user.id, updatedUser);
    }
    
    return { ...userBoostData, boost_type: this.boostTypes.get(userBoost.boost_type_id)! };
  }
  
  async deactivateExpiredBoosts(): Promise<number> {
    const now = new Date();
    let count = 0;
    
    for (const [id, boost] of this.userBoosts.entries()) {
      if (boost.is_active && new Date(boost.end_time) <= now) {
        const updatedBoost = {
          ...boost,
          is_active: false
        };
        this.userBoosts.set(id, updatedBoost);
        count++;
      }
    }
    
    return count;
  }
  
  // Referral methods
  async getReferrals(referrerId: number): Promise<(Referral & { referred_user: User })[]> {
    const referralEntries = Array.from(this.referrals.values())
      .filter(r => r.referrer_id === referrerId);
    
    return referralEntries.map(r => {
      const referred = this.users.get(r.referred_id)!;
      return { ...r, referred_user: referred };
    });
  }
  
  async createReferral(referral: InsertReferral): Promise<Referral> {
    const id = this.referralIdCounter++;
    const referralData: Referral = {
      ...referral,
      id,
      created_at: new Date()
    };
    
    this.referrals.set(id, referralData);
    
    // Award points to the referrer
    const referrer = this.users.get(referral.referrer_id);
    if (referrer) {
      const updatedReferrer = {
        ...referrer,
        points: referrer.points + referral.points,
        // Boost referrer's mining speed by 5%
        mining_speed: Math.floor(referrer.mining_speed * 1.05)
      };
      this.users.set(referrer.id, updatedReferrer);
    }
    
    return referralData;
  }
  
  async getReferralCount(userId: number): Promise<number> {
    return Array.from(this.referrals.values())
      .filter(r => r.referrer_id === userId).length;
  }
}

// Ortama göre farklı storage sağlayıcıları
let storageInstance: IStorage;

// Storage örneğini döndüren fonksiyon
export function getStorage(): IStorage {
  if (!storageInstance) {
    if (process.env.NODE_ENV === 'production') {
      console.log('Using Supabase storage in production');
      storageInstance = new SupabaseStorage();
    } else {
      console.log('Using in-memory storage for development');
      // Geliştirme ortamında da Supabase kullan
      storageInstance = new SupabaseStorage();
    }
  }
  
  return storageInstance;
}

// Storage instance'ını export et
export const storage = getStorage();
