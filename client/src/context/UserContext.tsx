import React, { createContext, useState, useEffect, useCallback, useContext } from "react";
import { User, UserBoost } from "@/types";
import { authenticateTelegramUser } from "@/lib/telegram";
import { calculateMiningSpeed, isMiningAvailable } from "@/lib/mining";
import LoadingScreen from "@/components/LoadingScreen";
import { getUserByTelegramId, createUser } from '@/lib/api';
import { checkTelegramAPI } from '@/lib/telegram';
import { nanoid } from 'nanoid';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  activeBoosts: UserBoost[];
  refreshUser: () => Promise<void>;
  claimMiningRewards: () => Promise<boolean>;
  setUser: (user: User | null) => void;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  error: null,
  activeBoosts: [],
  refreshUser: async () => {},
  claimMiningRewards: async () => false,
  setUser: () => {},
});

interface UserProviderProps {
  children: React.ReactNode;
  telegramMode?: boolean;
}

// Telegram API endpoint
const TELEGRAM_API_ENDPOINT = '/api/telegram';

// Test kullanıcısı oluşturmak için helper function
const createTestUser = (): User => {
  return {
    id: "0",
    telegramId: 'test-user-' + Date.now(),
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    photoUrl: null,
    level: 1,
    points: 0,
    miningSpeed: 1,
    lastMiningTime: new Date(),
    role: 'user',
    registeredAt: new Date(),
    referralCode: 'TEST123',
    referredBy: undefined,
    isActive: true,
  };
};

// URL parametreleri yardımcı fonksiyonu
function getUrlParameter(name: string): string | null {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  const results = regex.exec(location.search);
  return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

export const UserProvider = ({ children, telegramMode = false }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBoosts, setActiveBoosts] = useState<UserBoost[]>([]);
  const [initAttempts, setInitAttempts] = useState(0);
  const [useFallback, setUseFallback] = useState(false);
  const [apiCheckDone, setApiCheckDone] = useState(false);
  
  // DEV ortamında olup olmadığımızı kontrol et
  const isDevelopment = import.meta.env?.DEV === true;

  // Initialize user from Telegram
  useEffect(() => {
    const initializeUser = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("UserContext - Checking if we're in TelegramApp");
        
        // API bağlantısını kontrol et
        const apiIsWorking = await checkTelegramAPI();
        setApiCheckDone(true);
        
        if (!apiIsWorking) {
          console.warn("UserContext - API check failed, may affect authentication");
        }
        
        // Test kullanıcısı oluşturmak için fallback zamanlayıcısı
        // Bu, Telegram bağlantısı başarısız olursa 5 saniye sonra bir test kullanıcısı oluşturur
        const fallbackTimerId = setTimeout(() => {
          if (isLoading && !user) {
            console.log("UserContext - Fallback to test user after timeout");
            const testUser: User = {
              id: 0,
              telegramId: 'test-user-' + Date.now(),
              firstName: 'Test',
              lastName: 'User',
              username: 'testuser',
              photoUrl: null,
              level: 1,
              points: 0,
              miningSpeed: 1,
              lastMiningTime: new Date(),
              role: 'user',
              registeredAt: new Date(),
              referralCode: 'TEST123',
              referredBy: null,
              isActive: true,
            };
            setUser(testUser);
            setUseFallback(true);
            setIsLoading(false);
          }
        }, 5000);

        // Check if we're running inside Telegram Mini App
        let telegramInitData = null;
        let telegramId = null;
        let telegramUser = null;
        
        try {
          // Farkli obje adlandırma formatlarını kontrol et (Telegram standart değil)
          console.log("Testing for Telegram window objects:");
          console.log("window.Telegram exists:", !!window.Telegram);
          console.log("window.telegram exists:", !!(window as any).telegram);
          console.log("window.TelegramWebApp exists:", !!(window as any).TelegramWebApp);
          
          // Tüm Telegram bağlantılı objeleri logla
          const telegramKeys = Object.keys(window).filter(key => 
            key.toLowerCase().includes('telegram')
          );
          console.log("All Telegram-related window objects:", telegramKeys);
          
          // Telegram objesini JSON olarak çıkar
          try {
            console.log("Telegram object stringified:", 
              JSON.stringify(window.Telegram, null, 2).substring(0, 500));
          } catch (err: any) {
            console.warn("Could not stringify Telegram object:", err?.message);
          }

          // Dogru Telegram objesini bul
          if (window.Telegram) {
            telegramInitData = window.Telegram.WebApp.initData;
            telegramUser = window.Telegram.WebApp.initDataUnsafe?.user;
            telegramId = telegramUser?.id?.toString();
            console.log("Found Telegram.WebApp user:", telegramUser);
          } else if ((window as any).telegram) {
            const telegram = (window as any).telegram;
            telegramInitData = telegram.initData || telegram.WebApp?.initData;
            telegramUser = telegram.initDataUnsafe?.user || telegram.WebApp?.initDataUnsafe?.user;
            telegramId = telegramUser?.id?.toString();
            console.log("Found telegram user:", telegramUser);
          } else if ((window as any).TelegramWebApp) {
            const telegramWebApp = (window as any).TelegramWebApp;
            telegramInitData = telegramWebApp.initData;
            telegramUser = telegramWebApp.initDataUnsafe?.user;
            telegramId = telegramUser?.id?.toString();
            console.log("Found TelegramWebApp user:", telegramUser);
          }
          
          // Iframe durumunu kontrol et - eğer uygulama iframe içindeyse, ana pencerede Telegram olabilir
          if (!telegramUser && window !== window.parent) {
            try {
              console.log("Checking parent window for Telegram objects");
              const windowKeys = Object.keys(window.parent);
              console.log("Parent window keys:", windowKeys.slice(0, 20), "...");
              
              if (window.parent.Telegram) {
                telegramInitData = window.parent.Telegram.WebApp.initData;
                telegramUser = window.parent.Telegram.WebApp.initDataUnsafe?.user;
                telegramId = telegramUser?.id?.toString();
                console.log("Found parent Telegram.WebApp user:", telegramUser);
              }
            } catch (frameErr: any) {
              console.warn("Could not access parent window:", frameErr?.message);
            }
          }
        } catch (windowErr: any) {
          console.error("Error accessing Telegram objects:", windowErr?.message);
        }

        // Check if we found a Telegram user
        if (telegramUser && telegramId) {
          console.log(`UserContext - Telegram user found with ID: ${telegramId}`);
          
          // Try to get user from backend by telegramId
          try {
            const existingUser = await getUserByTelegramId(telegramId);
            clearTimeout(fallbackTimerId);
            
            if (existingUser) {
              console.log("UserContext - Existing user found:", existingUser);
              setUser(existingUser);
              setIsLoading(false);
            } else {
              // Create a new user with Telegram data
              console.log("UserContext - Creating new user with Telegram data");
              const newUser = await createUser({
                telegramId,
                firstName: telegramUser.first_name || 'User',
                lastName: telegramUser.last_name || null,
                username: telegramUser.username || null,
                photoUrl: telegramUser.photo_url || null,
                referralCode: `REF-${nanoid(6)}`,
                // Other fields will have default values from server
              });
              
              if (newUser) {
                console.log("UserContext - New user created:", newUser);
                setUser(newUser);
              } else {
                throw new Error("Failed to create user");
              }
              setIsLoading(false);
            }
          } catch (err: any) {
            console.error("UserContext - Error in authentication:", err?.message);
            setError(`Authentication failed: ${err?.message || 'Unknown error'}`);
            setIsLoading(false);
          }
        } else {
          console.log("UserContext - No Telegram user found, using test user");
          // Keep loading, fallback timer will create a test user after timeout
        }
      } catch (err: any) {
        clearTimeout(fallbackTimerId);
        console.error("UserContext - Authentication error:", err?.message);
        setError(`Authentication error: ${err?.message || 'Unknown error'}`);
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

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
          // Re-authenticate to get fresh user data - telegramMode etkin olduğunda forceTelegram=true
          const refreshedUser = await authenticateTelegramUser(undefined, true);
          
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
        setUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
