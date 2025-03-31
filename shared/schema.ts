import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// User Role Enum
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegram_id: text("telegram_id").notNull().unique(),
  firstname: text("firstname").notNull(),
  lastname: text("lastname"),
  username: text("username"),
  photo_url: text("photo_url"),
  level: integer("level").notNull().default(1),
  points: integer("points").notNull().default(0),
  mining_speed: integer("mining_speed").notNull().default(10),
  last_mining_time: timestamp("last_mining_time").notNull().default(sql`now()`),
  completed_tasks_count: integer("completed_tasks_count").notNull().default(0),
  boost_usage_count: integer("boost_usage_count").notNull().default(0),
  join_date: timestamp("join_date").notNull().default(sql`now()`),
  referral_code: text("referral_code").notNull().unique(),
  referred_by: text("referred_by"),
  role: userRoleEnum("role").notNull().default("user"),
  password: text("password"), // Admin kullanıcılar için şifre
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  level: true,
  points: true,
  mining_speed: true,
  last_mining_time: true,
  completed_tasks_count: true,
  boost_usage_count: true,
});

// Task Types Enum
export const taskTypeEnum = pgEnum("task_type", ["daily", "weekly", "special"]);

// Tasks Schema
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  points: integer("points").notNull(),
  type: taskTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  required_amount: integer("required_amount").notNull().default(1),
  is_active: boolean("is_active").notNull().default(true),
  telegram_action: text("telegram_action"), // For tasks requiring Telegram interaction
  telegram_target: text("telegram_target"), // Target group, channel, etc.
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
});

// User Tasks Schema (for tracking user progress)
export const userTasks = pgTable("user_tasks", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  task_id: integer("task_id").notNull().references(() => tasks.id),
  progress: integer("progress").notNull().default(0),
  is_completed: boolean("is_completed").notNull().default(false),
  completed_at: timestamp("completed_at"),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertUserTaskSchema = createInsertSchema(userTasks).omit({
  id: true,
  completed_at: true,
  created_at: true,
});

// Boost Types Schema
export const boostTypes = pgTable("boost_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  multiplier: integer("multiplier").notNull(), // Store as integer (e.g., 150 for 1.5x)
  duration_hours: integer("duration_hours").notNull(),
  price: integer("price").notNull(), // Price in points
  icon_name: text("icon_name").notNull().default("rocket"),
  color_class: text("color_class").notNull().default("blue"),
  is_popular: boolean("is_popular").notNull().default(false),
});

export const insertBoostTypeSchema = createInsertSchema(boostTypes).omit({
  id: true,
});

// User Boosts Schema (active boosts for users)
export const userBoosts = pgTable("user_boosts", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  boost_type_id: integer("boost_type_id").notNull().references(() => boostTypes.id),
  start_time: timestamp("start_time").notNull().default(sql`now()`),
  end_time: timestamp("end_time").notNull(),
  is_active: boolean("is_active").notNull().default(true),
});

export const insertUserBoostSchema = createInsertSchema(userBoosts).omit({
  id: true,
  start_time: true,
});

// Referrals Schema
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrer_id: integer("referrer_id").notNull().references(() => users.id),
  referred_id: integer("referred_id").notNull().references(() => users.id),
  points: integer("points").notNull().default(100),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  created_at: true,
});

// Export all types
export interface User {
  id: number;
  telegramId: string;
  firstname: string;
  lastname: string | null;
  username: string | null;
  photoUrl: string | null;
  level: number;
  points: number;
  miningSpeed: number;
  lastMiningTime: Date;
  completedTasksCount: number;
  boostUsageCount: number;
  joinDate: Date;
  referralCode: string;
  referredBy: string | null;
  role: 'user' | 'admin';
  password: string | null;
}

export interface InsertUser {
  telegramId: string;
  firstname: string;
  lastname?: string | null;
  username?: string | null;
  photoUrl?: string | null;
  referralCode: string;
  role?: 'user' | 'admin';
  password?: string;
}

export interface Task {
  id: number;
  points: number;
  type: 'daily' | 'weekly' | 'special';
  title: string;
  description: string;
  required_amount: number;
  is_active: boolean;
  telegram_action: string | null;
  telegram_target: string | null;
}

export interface InsertTask {
  points: number;
  type: 'daily' | 'weekly' | 'special';
  title: string;
  description: string;
  required_amount: number;
  is_active?: boolean;
  telegram_action?: string | null;
  telegram_target?: string | null;
}

export interface UserTask {
  id: number;
  user_id: number;
  task_id: number;
  progress: number;
  is_completed: boolean;
  completed_at: Date | null;
  created_at: Date;
}

export interface InsertUserTask {
  user_id: number;
  task_id: number;
  progress?: number;
  is_completed?: boolean;
}

export interface BoostType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  multiplier: number;
  duration_hours: number;
  price: number;
  icon_name: string;
  color_class: string;
  is_popular: boolean;
}

export interface InsertBoostType {
  name: string;
  description: string;
  is_active?: boolean;
  multiplier: number;
  duration_hours: number;
  price: number;
  icon_name?: string;
  color_class?: string;
  is_popular?: boolean;
}

export interface UserBoost {
  id: number;
  is_active: boolean;
  user_id: number;
  boost_type_id: number;
  start_time: Date;
  end_time: Date;
}

export interface InsertUserBoost {
  user_id: number;
  boost_type_id: number;
  end_time: Date;
  is_active?: boolean;
}

export interface Referral {
  id: number;
  points: number;
  created_at: Date;
  referrer_id: number;
  referred_id: number;
}

export interface InsertReferral {
  referrer_id: number;
  referred_id: number;
  points?: number;
}
