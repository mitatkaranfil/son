import { UserBoost, BoostType, User } from "@/types";

// Calculate time until next mining operation (format as MM:SS)
export function calculateNextMiningTime(lastMiningTime: Date): string {
  const now = new Date();
  const lastMining = new Date(lastMiningTime);
  
  // Mining rewards occur on the hour boundary
  const nextMiningDate = new Date(lastMining);
  nextMiningDate.setHours(nextMiningDate.getHours() + 1);
  nextMiningDate.setMinutes(0);
  nextMiningDate.setSeconds(0);
  
  // Calculate remaining time
  const remainingMs = nextMiningDate.getTime() - now.getTime();
  
  if (remainingMs <= 0) {
    return "00:00"; // Mining is ready
  }
  
  // Format as MM:SS
  const minutes = Math.floor(remainingMs / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Calculate current mining speed considering boosts
export function calculateMiningSpeed(baseMiningSpeed: number, activeBoosts: UserBoost[]): number {
  if (!activeBoosts || activeBoosts.length === 0) {
    return baseMiningSpeed;
  }
  
  let finalSpeed = baseMiningSpeed;
  
  // Apply each boost multiplier
  activeBoosts.forEach(boost => {
    if (boost.boostType) {
      const multiplier = boost.boostType.multiplier / 100;
      finalSpeed = Math.floor(finalSpeed * multiplier);
    }
  });
  
  return finalSpeed;
}

// Format remaining boost time
export function formatBoostRemainingTime(endTime: Date): string {
  const now = new Date();
  const end = new Date(endTime);
  
  // Calculate the time difference in milliseconds
  const diffMs = end.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return "00:00:00"; // Expired
  }
  
  // Convert to hours, minutes, seconds
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Format points with comma separator
export function formatPoints(points: number): string {
  return points.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Check if mining is available (passed the hour boundary)
export function isMiningAvailable(lastMiningTime: Date): boolean {
  const now = new Date();
  const lastMining = new Date(lastMiningTime);
  
  // Check if current hour is greater than last mining hour
  return (
    now.getHours() > lastMining.getHours() ||
    now.getDate() > lastMining.getDate() ||
    now.getMonth() > lastMining.getMonth() ||
    now.getFullYear() > lastMining.getFullYear()
  );
}

// Calculate potential earnings with a specific boost
export function calculatePotentialEarnings(
  baseMiningSpeed: number, 
  boostMultiplier: number, 
  durationHours: number
): number {
  const boostedSpeed = Math.floor(baseMiningSpeed * (boostMultiplier / 100));
  const potentialEarnings = boostedSpeed * durationHours;
  return potentialEarnings;
}

// Format a date to local string (e.g., "15.07.2023")
export function formatDate(date: Date | { seconds: number, nanoseconds: number }): string {
  try {
    // Check if date is Firestore Timestamp
    if (date && typeof date === 'object' && 'seconds' in date && 'nanoseconds' in date) {
      // Convert Firestore Timestamp to JavaScript Date
      const jsDate = new Date(date.seconds * 1000);
      return jsDate.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    
    // Convert to proper Date object if it's not already
    const dateObj = date instanceof Date ? date : new Date(date as any);
    
    return dateObj.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (err) {
    console.error('Error formatting date:', err, date);
    return 'Geçersiz Tarih';
  }
}

// Calculate time since join date (e.g., "3 days ago")
export function formatTimeSinceJoin(joinDate: Date | { seconds: number, nanoseconds: number }): string {
  try {
    const now = new Date();
    let joined: Date;
    
    // Check if date is Firestore Timestamp
    if (joinDate && typeof joinDate === 'object' && 'seconds' in joinDate && 'nanoseconds' in joinDate) {
      joined = new Date((joinDate as any).seconds * 1000);
    } else {
      joined = joinDate instanceof Date ? joinDate : new Date(joinDate as any);
    }
    
    const diffMs = now.getTime() - joined.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
    if (diffDays === 0) {
      return "Bugün katıldı";
    } else if (diffDays === 1) {
      return "Dün katıldı";
    } else {
      return `${diffDays} gün önce katıldı`;
    }
  } catch (err) {
    console.error('Error formatting join time:', err);
    return "Bilinmeyen tarih";
  }
}

// Get user's level based on points
export function calculateUserLevel(points: number): number {
  if (points < 1000) return 1;
  if (points < 5000) return 2;
  if (points < 15000) return 3;
  if (points < 50000) return 4;
  if (points < 150000) return 5;
  return 6;
}

// Get mining status text
export function getMiningStatus(
  lastMiningTime: Date | { seconds: number, nanoseconds: number },
  activeBoosts: UserBoost[]
): { text: string; className: string } {
  try {
    let lastMined: Date;
    
    // Check if date is Firestore Timestamp
    if (lastMiningTime && typeof lastMiningTime === 'object' && 'seconds' in lastMiningTime && 'nanoseconds' in lastMiningTime) {
      lastMined = new Date((lastMiningTime as any).seconds * 1000);
    } else {
      lastMined = lastMiningTime instanceof Date ? lastMiningTime : new Date(lastMiningTime as any);
    }
    
    if (isMiningAvailable(lastMined)) {
      return { text: "Kazım Hazır", className: "text-green-400" };
    }
    
    if (activeBoosts && activeBoosts.length > 0) {
      return { text: "Boost Aktif", className: "text-accent" };
    }
    
    return { text: "Çalışıyor", className: "text-primary" };
  } catch (err) {
    console.error('Error determining mining status:', err);
    return { text: "Belirsiz", className: "text-gray-400" };
  }
}

// Format time remaining until a specific date
export function formatTimeRemaining(endDate: Date): string {
  const now = new Date();
  const end = new Date(endDate);
  
  // Calculate the time difference in milliseconds
  const diffMs = end.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return "Şimdi"; // Time has already passed
  }
  
  // If less than a minute remaining
  if (diffMs < 60000) {
    const seconds = Math.floor(diffMs / 1000);
    return `${seconds} sn`;
  }
  
  // Format as MM:SS
  const minutes = Math.floor(diffMs / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
