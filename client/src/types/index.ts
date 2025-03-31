// User Type
export interface User {
  id: string;
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  level: number;
  points: number;
  miningSpeed: number;
  lastMiningTime: Date;
  referralCode: string;
  referredBy?: string;
  joinDate: Date;
  completedTasksCount: number;
  boostUsageCount: number;
  referralCount?: number; // Used in UI, not stored directly
}

// Task Type
export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  points: number;
  requiredAmount: number;
  isActive: boolean;
  telegramAction?: string | null;
  telegramTarget?: string | null;
  createdAt?: Date;
}

// User Task Type
export interface UserTask {
  id: string;
  userId: string;
  taskId: string;
  progress: number;
  isCompleted: boolean;
  completedAt?: Date | null;
  createdAt: Date;
  task?: Task; // Populated when retrieved
}

// Boost Type
export interface BoostType {
  id: string;
  name: string;
  description: string;
  multiplier: number; // Stored as integer (e.g., 150 for 1.5x)
  durationHours: number;
  price: number;
  isActive: boolean;
  iconName: string;
  colorClass: string;
  isPopular: boolean;
  createdAt?: Date;
}

// User Boost Type
export interface UserBoost {
  id: string;
  userId: string;
  boostTypeId: string;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  createdAt?: Date;
  boostType?: BoostType; // Populated when retrieved
}

// Referral Type
export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  points: number;
  createdAt: Date;
  referred?: User; // Populated when retrieved
}

// Active Tab Type
export type ActiveTab = 'dashboard' | 'tasks' | 'boost' | 'profile';

// Task Filter Type
export type TaskFilter = 'all' | 'daily' | 'weekly' | 'special';
