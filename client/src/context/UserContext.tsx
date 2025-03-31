import { createContext, useState, useEffect, ReactNode } from "react";
import { User, UserBoost } from "@/types";
import { authenticateTelegramUser } from "@/lib/telegram";
import { calculateMiningSpeed, isMiningAvailable } from "@/lib/mining";
import LoadingScreen from "@/components/LoadingScreen";

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  activeBoosts: UserBoost[];
  refreshUser: () => Promise<void>;
  claimMiningRewards: () => Promise<boolean>;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  error: null,
  activeBoosts: [],
  refreshUser: async () => {},
  claimMiningRewards: async () => false,
});

interface UserProviderProps {
  children: ReactNode;
}

// Fallback kullanıcı oluştur
const createFallbackUser = (): User => {
  return {
    id: `test-${Math.random().toString(36).substring(2, 10)}`,
    telegramId: '123456789',
    firstName: 'Test',
    lastName: 'User',
    username: 'test_user',
    points: 500,
    miningSpeed: 10,
    lastMiningTime: new Date(),
    referralCode: Math.random().toString(36).substring(2, 8),
    joinDate: new Date(),
    level: 1,
    completedTasksCount: 0,
    boostUsageCount: 0
  };
};

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBoosts, setActiveBoosts] = useState<UserBoost[]>([]);
  const [initAttempts, setInitAttempts] = useState(0);
  const [useFallback, setUseFallback] = useState(false);

  // Initialize user from Telegram
  useEffect(() => {
    const initUser = async () => {
      try {
        setIsLoading(true);
        console.log("UserContext - Initializing user, attempt:", initAttempts + 1);
        
        // Get URL parameters for referral
        const urlParams = new URLSearchParams(window.location.search);
        const referralCode = urlParams.get("ref");
        
        if (!useFallback) {
          console.log("UserContext - Attempting Telegram authentication");
          // Authenticate with Telegram
          const authenticatedUser = await authenticateTelegramUser(referralCode || undefined);
          
          console.log("UserContext - Authentication result:", authenticatedUser ? "Success" : "Failed");
          
          if (authenticatedUser) {
            setUser(authenticatedUser);
            console.log("UserContext - User set:", authenticatedUser);
            
            // Load active boosts
            await loadUserBoosts(authenticatedUser);
            
            // Check for mining rewards
            await checkAndClaimMiningRewards(authenticatedUser);
            
            setIsLoading(false);
            return; // Başarılı olduğumuz için fonksiyondan çık
          }
          
          console.error("UserContext - Authentication returned null user");
          
          // If we failed to authenticate but have made less than 3 attempts,
          // we'll try again in a moment (to give Telegram WebApp time to initialize)
          if (initAttempts < 2) {
            console.log(`UserContext - Retrying authentication (attempt ${initAttempts + 1}/3)`);
            setInitAttempts(prev => prev + 1);
            return; // Exit without setting isLoading to false
          }
        }
        
        // Telegram authentication failed repeatedly, use fallback user
        console.log("UserContext - Using fallback user after authentication failures");
        const fallbackUser = createFallbackUser();
        setUser(fallbackUser);
        setUseFallback(true);
        
      } catch (err) {
        console.error("UserContext - Error initializing user:", err);
        setError("Failed to initialize user. Using fallback mode.");
        
        // Error durumunda fallback kullanıcı oluştur
        console.log("UserContext - Creating fallback user after error");
        const fallbackUser = createFallbackUser();
        setUser(fallbackUser);
        setUseFallback(true);
      } finally {
        console.log("UserContext - User initialization completed or using fallback");
        setIsLoading(false);
      }
    };
    
    // Yardımcı fonksiyonlar
    const loadUserBoosts = async (currentUser: User) => {
      if (!currentUser.id) return;
      
      console.log("UserContext - Loading boosts for user:", currentUser.id);
      try {
        const response = await fetch(`/api/users/${currentUser.id}/boosts`);
        if (response.ok) {
          const boosts = await response.json();
          console.log("UserContext - Loaded boosts:", boosts.length);
          setActiveBoosts(boosts);
        } else {
          console.error("UserContext - Failed to load boosts from API");
        }
      } catch (boostErr) {
        console.error("UserContext - Error loading boosts:", boostErr);
      }
    };
    
    const checkAndClaimMiningRewards = async (currentUser: User) => {
      if (!currentUser.lastMiningTime) return;
      
      if (isMiningAvailable(currentUser.lastMiningTime as Date)) {
        console.log("UserContext - Claiming mining rewards");
        try {
          await claimMiningRewards(currentUser);
          console.log("UserContext - Mining rewards claimed");
        } catch (miningErr) {
          console.error("UserContext - Error claiming mining rewards:", miningErr);
        }
      }
    };

    initUser();
  }, [initAttempts]); // Re-run when initAttempts changes

  // Check for mining rewards
  const claimMiningRewards = async (userToUpdate = user): Promise<boolean> => {
    if (!userToUpdate) return false;
    
    try {
      const lastMining = new Date(userToUpdate.lastMiningTime as Date);
      const now = new Date();
      
      // Calculate hours passed
      const hoursDiff = Math.floor(
        (now.getTime() - lastMining.getTime()) / (1000 * 60 * 60)
      );
      
      if (hoursDiff <= 0) return false;
      
      // Calculate mining speed with boosts
      let miningSpeed = userToUpdate.miningSpeed;
      
      // Apply boost multipliers
      for (const boost of activeBoosts) {
        miningSpeed = Math.floor(
          miningSpeed * (boost.boostType!.multiplier / 100)
        );
      }
      
      // Calculate earned points
      const earnedPoints = hoursDiff * miningSpeed;
      
      if (!useFallback) {
        try {
          // Update points via API
          const pointsResponse = await fetch(`/api/users/${userToUpdate.id}/points`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ points: earnedPoints }),
          });
          
          if (!pointsResponse.ok) {
            throw new Error("Failed to update points");
          }
          
          // Update last mining time via API
          const miningTimeResponse = await fetch(`/api/users/${userToUpdate.id}/mining-time`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!miningTimeResponse.ok) {
            throw new Error("Failed to update mining time");
          }
        } catch (error) {
          console.error("API error for mining rewards:", error);
          // Fallback moduna geç
          setUseFallback(true);
        }
      }
      
      if (useFallback) {
        // Fallback modunda kullanıcı durumunu yerel olarak güncelle
        setUser(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            points: prev.points + earnedPoints,
            lastMiningTime: new Date()
          };
        });
      } else {
        // Refresh user
        await refreshUser();
      }
      
      return true;
    } catch (err) {
      console.error("Error claiming mining rewards:", err);
      return false;
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      if (!useFallback) {
        try {
          // Re-authenticate to get fresh user data
          const refreshedUser = await authenticateTelegramUser();
          
          if (!refreshedUser) {
            throw new Error("Failed to refresh user");
          }
          
          setUser(refreshedUser);
          
          // Refresh active boosts
          if (refreshedUser.id) {
            const response = await fetch(`/api/users/${refreshedUser.id}/boosts`);
            if (response.ok) {
              const boosts = await response.json();
              setActiveBoosts(boosts);
            } else {
              console.error("Failed to refresh boosts");
            }
          }
        } catch (error) {
          console.error("API error during refresh:", error);
          setUseFallback(true);
        }
      }
      
      if (useFallback) {
        // Fallback modunda sadece kullanıcı yenileme tarihi güncellenir
        setUser(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            lastMiningTime: new Date()
          };
        });
      }
      
    } catch (err) {
      console.error("Error refreshing user:", err);
      setError("Failed to refresh user data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !user) {
    return <LoadingScreen message="Uygulama yükleniyor..." />;
  }

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        error,
        activeBoosts,
        refreshUser,
        claimMiningRewards,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
