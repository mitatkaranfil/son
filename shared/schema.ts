import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// User Role Enum
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  firstname: text("firstname").notNull(),
  lastname: text("lastname"),
  username: text("username"),
  photoUrl: text("photo_url"),
  level: integer("level").notNull().default(1),
  points: integer("points").notNull().default(0),
  miningSpeed: integer("mining_speed").notNull().default(10), // points per hour
  lastMiningTime: timestamp("last_mining_time").notNull().default(sql`now()`),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by"),
  joinDate: timestamp("join_date").notNull().default(sql`now()`),
  completedTasksCount: integer("completed_tasks_count").notNull().default(0),
  boostUsageCount: integer("boost_usage_count").notNull().default(0),
  role: userRoleEnum("role").notNull().default("user"),
  password: text("password"), // Admin kullanıcılar için şifre
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  level: true,
  points: true,
  miningSpeed: true,
  lastMiningTime: true,
  completedTasksCount: true,
  boostUsageCount: true,
});

// Task Types Enum
export const taskTypeEnum = pgEnum("task_type", ["daily", "weekly", "special"]);

// Tasks Schema
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: taskTypeEnum("type").notNull(),
  points: integer("points").notNull(),
  requiredAmount: integer("required_amount").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  telegramAction: text("telegram_action"), // For tasks requiring Telegram interaction
  telegramTarget: text("telegram_target"), // Target group, channel, etc.
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
});

// User Tasks Schema (for tracking user progress)
export const userTasks = pgTable("user_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  progress: integer("progress").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertUserTaskSchema = createInsertSchema(userTasks).omit({
  id: true,
  completedAt: true,
  createdAt: true,
});

// Boost Types Schema
export const boostTypes = pgTable("boost_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  multiplier: integer("multiplier").notNull(), // Store as integer (e.g., 150 for 1.5x)
  durationHours: integer("duration_hours").notNull(),
  price: integer("price").notNull(), // Price in points
  isActive: boolean("is_active").notNull().default(true),
  iconName: text("icon_name").notNull().default("rocket"),
  colorClass: text("color_class").notNull().default("blue"),
  isPopular: boolean("is_popular").notNull().default(false),
});

export const insertBoostTypeSchema = createInsertSchema(boostTypes).omit({
  id: true,
});

// User Boosts Schema (active boosts for users)
export const userBoosts = pgTable("user_boosts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  boostTypeId: integer("boost_type_id").notNull().references(() => boostTypes.id),
  startTime: timestamp("start_time").notNull().default(sql`now()`),
  endTime: timestamp("end_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertUserBoostSchema = createInsertSchema(userBoosts).omit({
  id: true,
  startTime: true,
});

// Referrals Schema
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull().references(() => users.id),
  referredId: integer("referred_id").notNull().references(() => users.id),
  points: integer("points").notNull().default(100),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});

// Export all types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type UserTask = typeof userTasks.$inferSelect;
export type InsertUserTask = z.infer<typeof insertUserTaskSchema>;

export type BoostType = typeof boostTypes.$inferSelect;
export type InsertBoostType = z.infer<typeof insertBoostTypeSchema>;

export type UserBoost = typeof userBoosts.$inferSelect;
export type InsertUserBoost = z.infer<typeof insertUserBoostSchema>;

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
