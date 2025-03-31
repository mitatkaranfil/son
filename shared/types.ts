export interface User {
  id: string;
  email: string;
  telegramId: string;
  firstname: string;
  lastname: string;
  // Diğer kullanıcı alanları
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  // Diğer görev alanları
}

export interface Boost {
  id: string;
  userId: string;
  durationHours: number;
  cost: number;
  // Diğer boost alanları
}
