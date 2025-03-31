import { User, Task, UserTask, BoostType, UserBoost, Referral } from "@/types";

// API endpoint base URL
const API_BASE_URL = '/api';

// Genel hata işleme fonksiyonu
function handleError(error: any, message: string): never {
  console.error(`${message}:`, error);
  throw new Error(`${message}: ${error instanceof Error ? error.message : String(error)}`);
}

// Generic fetch fonksiyonu
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    handleError(error, `API request failed: ${endpoint}`);
  }
}

// User ile ilgili API çağrıları
export async function getUserByTelegramId(telegramId: string): Promise<User | null> {
  try {
    return await fetchAPI<User>(`/users/telegram/${telegramId}`);
  } catch (error) {
    console.warn(`User not found with telegramId ${telegramId}:`, error);
    return null;
  }
}

export async function createUser(userData: Partial<User>): Promise<User> {
  return await fetchAPI<User>('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function updateUserPoints(userId: string, points: number): Promise<User> {
  return await fetchAPI<User>(`/users/${userId}/points`, {
    method: 'PATCH',
    body: JSON.stringify({ points }),
  });
}

export async function updateUserMiningSpeed(userId: string, speed: number): Promise<User> {
  return await fetchAPI<User>(`/users/${userId}/mining-speed`, {
    method: 'PATCH',
    body: JSON.stringify({ miningSpeed: speed }),
  });
}

export async function updateUserLastMiningTime(userId: string): Promise<User> {
  return await fetchAPI<User>(`/users/${userId}/mining-time`, {
    method: 'PATCH',
  });
}

// Task ile ilgili API çağrıları
export async function getTasks(type?: string): Promise<Task[]> {
  const endpoint = type ? `/tasks?type=${type}` : '/tasks';
  return await fetchAPI<Task[]>(endpoint);
}

export async function getUserTasks(userId: string): Promise<UserTask[]> {
  return await fetchAPI<UserTask[]>(`/users/${userId}/tasks`);
}

export async function updateUserTaskProgress(userId: string, taskId: string, progress: number): Promise<UserTask> {
  return await fetchAPI<UserTask>(`/users/${userId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ progress }),
  });
}

export async function completeUserTask(userId: string, taskId: string): Promise<UserTask> {
  return await fetchAPI<UserTask>(`/users/${userId}/tasks/${taskId}/complete`, {
    method: 'POST',
  });
}

// Boost ile ilgili API çağrıları
export async function getBoostTypes(): Promise<BoostType[]> {
  return await fetchAPI<BoostType[]>('/boosts');
}

export async function getUserBoosts(userId: string): Promise<UserBoost[]> {
  return await fetchAPI<UserBoost[]>(`/users/${userId}/boosts`);
}

export async function getUserActiveBoosts(userId: string): Promise<UserBoost[]> {
  return await fetchAPI<UserBoost[]>(`/users/${userId}/boosts/active`);
}

export async function createUserBoost(userId: string, boostTypeId: string): Promise<UserBoost> {
  return await fetchAPI<UserBoost>(`/users/${userId}/boosts`, {
    method: 'POST',
    body: JSON.stringify({ boostTypeId }),
  });
}

// Referral ile ilgili API çağrıları
export async function getUserReferrals(userId: string): Promise<Referral[]> {
  return await fetchAPI<Referral[]>(`/users/${userId}/referrals`);
}

export async function getReferralCount(userId: string): Promise<number> {
  const referrals = await getUserReferrals(userId);
  return referrals.length;
}

export async function createReferral(referrerId: string, referredId: string, points: number = 100): Promise<Referral> {
  return await fetchAPI<Referral>('/referrals', {
    method: 'POST',
    body: JSON.stringify({ referrerId, referredId, points }),
  });
} 