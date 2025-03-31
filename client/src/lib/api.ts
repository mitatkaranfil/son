import { User, Task, UserTask, BoostType, UserBoost, Referral } from "@/types";

// API endpoint base URL
const API_BASE_URL = '/api';

// Genel hata işleme fonksiyonu
function handleError(error: any, message: string): never {
  console.error(`${message}:`, error);
  throw new Error(`${message}: ${error instanceof Error ? error.message : String(error)}`);
}

// API istek yardımcı fonksiyonu - HTML yanıtlarını işler
async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    
    // HTML yanıtı kontrolü
    if (contentType && contentType.includes('text/html')) {
      console.error(`API Error: Endpoint ${url} returned HTML instead of JSON`);
      const htmlContent = await response.text();
      console.error('HTML Response:', htmlContent.substring(0, 200) + '...');
      throw new Error('Unexpected HTML response from API');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Request error:', error);
    throw error;
  }
}

// User ile ilgili API çağrıları
export async function getUserByTelegramId(telegramId: string): Promise<User | null> {
  try {
    // Hem standart API hem de Telegram-özel API'yi dene
    try {
      return await apiRequest<User>(`/api/telegram/user/${telegramId}`);
    } catch (error) {
      console.log('Falling back to standard API endpoint');
      return await apiRequest<User>(`/api/users/telegram/${telegramId}`);
    }
  } catch (error) {
    console.error('Error getting user by Telegram ID:', error);
    return null;
  }
}

export async function createUser(userData: Partial<User>): Promise<User | null> {
  try {
    // Hem standart API hem de Telegram-özel API'yi dene
    try {
      return await apiRequest<User>('/api/telegram/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
    } catch (error) {
      console.log('Falling back to standard API endpoint');
      return await apiRequest<User>('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
    }
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

export async function updateUserPoints(userId: string, points: number): Promise<User> {
  return await apiRequest<User>(`${API_BASE_URL}/users/${userId}/points`, {
    method: 'PATCH',
    body: JSON.stringify({ points }),
  });
}

export async function updateUserMiningSpeed(userId: string, speed: number): Promise<User> {
  return await apiRequest<User>(`${API_BASE_URL}/users/${userId}/mining-speed`, {
    method: 'PATCH',
    body: JSON.stringify({ miningSpeed: speed }),
  });
}

export async function updateUserLastMiningTime(userId: string): Promise<User> {
  return await apiRequest<User>(`${API_BASE_URL}/users/${userId}/mining-time`, {
    method: 'PATCH',
  });
}

// Task ile ilgili API çağrıları
export async function getTasks(type?: string): Promise<Task[]> {
  const endpoint = type ? `/tasks?type=${type}` : '/tasks';
  return await apiRequest<Task[]>(endpoint);
}

export async function getUserTasks(userId: string): Promise<UserTask[]> {
  return await apiRequest<UserTask[]>(`${API_BASE_URL}/users/${userId}/tasks`);
}

export async function updateUserTaskProgress(userId: string, taskId: string, progress: number): Promise<UserTask> {
  return await apiRequest<UserTask>(`${API_BASE_URL}/users/${userId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ progress }),
  });
}

export async function completeUserTask(userId: string, taskId: string): Promise<UserTask> {
  return await apiRequest<UserTask>(`${API_BASE_URL}/users/${userId}/tasks/${taskId}/complete`, {
    method: 'POST',
  });
}

// Boost ile ilgili API çağrıları
export async function getBoostTypes(): Promise<BoostType[]> {
  return await apiRequest<BoostType[]>('/boosts');
}

export async function getUserBoosts(userId: string): Promise<UserBoost[]> {
  return await apiRequest<UserBoost[]>(`${API_BASE_URL}/users/${userId}/boosts`);
}

export async function getUserActiveBoosts(userId: string): Promise<UserBoost[]> {
  return await apiRequest<UserBoost[]>(`${API_BASE_URL}/users/${userId}/boosts/active`);
}

export async function createUserBoost(userId: string, boostTypeId: string): Promise<UserBoost> {
  return await apiRequest<UserBoost>(`${API_BASE_URL}/users/${userId}/boosts`, {
    method: 'POST',
    body: JSON.stringify({ boostTypeId }),
  });
}

// Referral ile ilgili API çağrıları
export async function getUserReferrals(userId: string): Promise<Referral[]> {
  return await apiRequest<Referral[]>(`${API_BASE_URL}/users/${userId}/referrals`);
}

export async function getReferralCount(userId: string): Promise<number> {
  const referrals = await getUserReferrals(userId);
  return referrals.length;
}

export async function createReferral(referrerId: string, referredId: string, points: number = 100): Promise<Referral> {
  return await apiRequest<Referral>(`${API_BASE_URL}/referrals`, {
    method: 'POST',
    body: JSON.stringify({ referrerId, referredId, points }),
  });
}

// Admin API fonksiyonları
export async function createTask(task: Partial<Task>): Promise<Task> {
  return await apiRequest<Task>('/admin/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

export async function updateTask(id: string, task: Partial<Task>): Promise<Task> {
  return await apiRequest<Task>(`/admin/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(task),
  });
}

export async function deleteTask(id: string): Promise<boolean> {
  await apiRequest<void>(`/admin/tasks/${id}`, {
    method: 'DELETE',
  });
  return true;
}

export async function createBoostType(boostType: Partial<BoostType>): Promise<BoostType> {
  return await apiRequest<BoostType>('/admin/boosts', {
    method: 'POST',
    body: JSON.stringify(boostType),
  });
}

export async function updateBoostType(id: string, boostType: Partial<BoostType>): Promise<BoostType> {
  return await apiRequest<BoostType>(`/admin/boosts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(boostType),
  });
}

export async function deleteBoostType(id: string): Promise<boolean> {
  await apiRequest<void>(`/admin/boosts/${id}`, {
    method: 'DELETE',
  });
  return true;
} 