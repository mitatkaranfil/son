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
  telegramMode?: boolean;
}

// Telegram API endpoint
const TELEGRAM_API_ENDPOINT = '/api/telegram';

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
  
  // DEV ortamında olup olmadığımızı kontrol et
  const isDevelopment = import.meta.env?.DEV === true;

  // Initialize user from Telegram
  useEffect(() => {
    const initUser = async () => {
      try {
        setIsLoading(true);
        console.log("UserContext - Initializing user, attempt:", initAttempts + 1);
        
        // Telegram bağlantı zaman aşımı
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => {
            reject(new Error("Telegram connection timed out"));
          }, 5000); // 5 saniye sonra zaman aşımı
        });
        
        // Telegram bağlantısını zaman aşımı ile yarıştır
        Promise.race([
          initTelegramUser(),
          timeoutPromise
        ]).catch(error => {
          console.warn("UserContext - Telegram connection failed or timed out:", error?.message);
          console.log("UserContext - Creating fallback user");
          
          // Zaman aşımı veya hata durumunda fallback kullanıcı oluştur
          const fallbackUser = createFallbackUser();
          setUser(fallbackUser);
          setUseFallback(true);
        }).finally(() => {
          setIsLoading(false);
        });
      } catch (error: any) {
        console.error("UserContext - Error initializing user:", error?.message || "Unknown error");
        
        // Hata durumunda fallback kullanıcı oluştur
        const fallbackUser = createFallbackUser();
        setUser(fallbackUser);
        setUseFallback(true);
        setIsLoading(false);
      }
    };
    
    // Telegram kullanıcısını başlatma fonksiyonu
    const initTelegramUser = async (): Promise<void> => {
      // Telegram modu etkinleştirildi mi kontrol et
      if (!telegramMode) {
        console.log("UserContext - Telegram mode is disabled, using test user");
        const fallbackUser = createFallbackUser();
        setUser(fallbackUser);
        setUseFallback(true);
        return;
      }
      
      // Test için manuel kullanıcı oluşturmayı zorla
      const forceTestUser = getUrlParameter('forceTestUser') === 'true';
      if (forceTestUser) {
        console.log("UserContext - Forced test user mode enabled via URL parameter");
        const fallbackUser = createFallbackUser();
        setUser(fallbackUser);
        setUseFallback(true);
        return;
      }
      
      // URL'den Telegram parametrelerini al
      const tgWebAppData = getUrlParameter('tgWebAppData');
      const tgWebAppUser = getUrlParameter('user');
      
      console.log("UserContext - tgWebAppData:", tgWebAppData ? "exists" : "missing");
      console.log("UserContext - tgWebAppUser:", tgWebAppUser ? "exists" : "missing");
      
      let telegramUser = null;
      
      // URL parametrelerinden kullanıcı bilgisi çıkarmayı dene
      if (tgWebAppUser) {
        try {
          const userData = JSON.parse(decodeURIComponent(tgWebAppUser));
          console.log("UserContext - User data from URL:", userData);
          
          if (userData && userData.id) {
            telegramUser = {
              telegramId: userData.id.toString(),
              firstName: userData.first_name || userData.firstName || "User",
              lastName: userData.last_name || userData.lastName,
              username: userData.username,
              photoUrl: userData.photo_url || userData.photoUrl
            };
            console.log("UserContext - Created user from URL data:", telegramUser);
          }
        } catch (urlParseError) {
          console.error("UserContext - Error parsing URL user data:", urlParseError);
        }
      }
      
      // Telegram WebApp doğrudan kontrol
      if (!telegramUser) {
        console.log("UserContext - Checking Telegram WebApp directly");
        
        // Telegram global object içeriğini detaylı kontrol
        if (window.Telegram) {
          console.log("UserContext - window.Telegram exists");
          
          // Telegram.WebApp kontrolü
          if (window.Telegram.WebApp) {
            console.log("UserContext - window.Telegram.WebApp exists");
            
            // Tüm initDataUnsafe özelliklerini kontrol et
            if (window.Telegram.WebApp.initDataUnsafe) {
              console.log("UserContext - initDataUnsafe exists");
            }
            
            if (window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
              console.log("UserContext - window.Telegram.WebApp.initDataUnsafe.user exists");
              const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
              console.log("UserContext - User from Telegram:", JSON.stringify(tgUser));
              
              telegramUser = {
                telegramId: tgUser.id.toString(),
                firstName: tgUser.first_name,
                lastName: tgUser.last_name,
                username: tgUser.username,
                photoUrl: tgUser.photo_url
              };
            }
          }
        }
      }
      
      // Eğer doğrudan erişebildiysek, API çağrısını yapalım
      if (telegramUser) {
        console.log("UserContext - Using directly acquired Telegram user:", telegramUser);
        
        try {
          // Telegram özel API endpoint'ini kullan
          const response = await fetch(`${TELEGRAM_API_ENDPOINT}/user/${telegramUser.telegramId}`);
          
          // HTML yanıtı kontrolü - API hata verirse
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            console.error("UserContext - API returned HTML instead of JSON, API might be misconfigured");
            throw new Error("API returned HTML instead of JSON");
          }
          
          if (response.ok) {
            // Kullanıcı bulundu
            const userData = await response.json();
            console.log("UserContext - User found in API:", userData);
            setUser(userData);
          } else {
            // Kullanıcı bulunamadı, yeni kullanıcı oluştur
            console.log("UserContext - User not found, creating new user");
            
            try {
              // Benzersiz bir referral kodu oluştur
              const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
              
              const createData = {
                telegramId: telegramUser.telegramId,
                firstName: telegramUser.firstName,
                lastName: telegramUser.lastName || null,
                username: telegramUser.username || null,
                photoUrl: telegramUser.photoUrl || null,
                referralCode,
                referredBy: getUrlParameter('ref') || null
              };
              
              // Telegram özel API endpoint'ini kullan
              const createResponse = await fetch(`${TELEGRAM_API_ENDPOINT}/user`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(createData)
              });
              
              // HTML yanıtı kontrolü - API hata verirse
              const createContentType = createResponse.headers.get('content-type');
              if (createContentType && createContentType.includes('text/html')) {
                console.error("UserContext - API returned HTML instead of JSON during user creation");
                throw new Error("API returned HTML instead of JSON");
              }
              
              if (createResponse.ok) {
                const newUser = await createResponse.json();
                console.log("UserContext - New user created:", newUser);
                setUser(newUser);
              } else {
                throw new Error("Failed to create user");
              }
            } catch (createError: any) {
              console.error("UserContext - Error creating user:", createError?.message || "Unknown error");
              throw new Error("Failed to create user: " + (createError?.message || "Unknown error"));
            }
          }
        } catch (apiError: any) {
          console.error("UserContext - API error:", apiError?.message || "Unknown error");
          throw new Error("API error: " + (apiError?.message || "Unknown error"));
        }
      } else {
        console.warn("UserContext - No Telegram user found");
        throw new Error("No Telegram user found");
      }
    };

    // Kullanıcı zaten varsa yeniden yükleme
    if (user) {
      console.log("UserContext - User already exists, skipping initialization");
      return;
    }
    
    // İlk kez veya yeniden deneme
    if (initAttempts < 3) {
      console.log(`UserContext - Starting initialization attempt ${initAttempts + 1}`);
      setInitAttempts(prev => prev + 1);
      initUser();
    } else {
      console.error("UserContext - Error initializing user: Authentication failed after multiple attempts");
      setError("Authentication failed after multiple attempts");
      setIsLoading(false);
      
      // Son deneme de başarısız olursa fallback kullanıcı oluştur
      if (!user) {
        const fallbackUser = createFallbackUser();
        setUser(fallbackUser);
        setUseFallback(true);
      }
    }
  }, [initAttempts, user, telegramMode]);

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
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
