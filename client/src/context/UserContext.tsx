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

// URL parametreleri yardımcı fonksiyonu
function getUrlParameter(name: string): string | null {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  const results = regex.exec(location.search);
  return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

export const UserProvider = ({ children }: UserProviderProps) => {
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
        console.log("UserContext - window.location.href:", window.location.href);
        
        // Test için manuel kullanıcı oluşturmayı zorla
        const forceTestUser = getUrlParameter('forceTestUser') === 'true';
        if (forceTestUser) {
          console.log("UserContext - Forced test user mode enabled");
          const fallbackUser = createFallbackUser();
          setUser(fallbackUser);
          setUseFallback(true);
          setIsLoading(false);
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
          
          // Telegram WebApp kontrolü
          if (window.Telegram && window.Telegram.WebApp) {
            console.log("UserContext - window.Telegram.WebApp exists");
            
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
            } else {
              console.log("UserContext - No user data in window.Telegram.WebApp.initDataUnsafe");
              console.log("UserContext - initDataUnsafe:", JSON.stringify(window.Telegram.WebApp.initDataUnsafe));
            }
          } else {
            console.log("UserContext - window.Telegram.WebApp does not exist");
            // window nesnelerini kontrol et
            console.log("UserContext - window properties:", Object.keys(window).filter(key => key.includes('Telegram')));
          }
        }
        
        // Eğer doğrudan erişebildiysek, API çağrısını atlayıp kullanıcı verilerini doğrudan kullanalım
        if (telegramUser) {
          console.log("UserContext - Using directly acquired Telegram user:", telegramUser);
          
          try {
            // Kullanıcıyı API'de ara
            const response = await fetch(`/api/users/telegram/${telegramUser.telegramId}`);
            
            if (response.ok) {
              // Kullanıcı bulundu
              const userData = await response.json();
              console.log("UserContext - User found in API:", userData);
              setUser(userData);
              
              // Load active boosts
              await loadUserBoosts(userData);
              
              // Check for mining rewards
              await checkAndClaimMiningRewards(userData);
              
            } else if (response.status === 404) {
              // Kullanıcı yoksa oluştur
              console.log("UserContext - User not found, creating new user");
              
              // Generate a unique referral code for the new user
              const uniqueReferralCode = Math.random().toString(36).substring(2, 8);
              
              // Get URL parameters for referral
              const urlParams = new URLSearchParams(window.location.search);
              const referralCode = urlParams.get("ref");
              
              // Create new user via API
              const createResponse = await fetch('/api/users', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  telegramId: telegramUser.telegramId,
                  firstName: telegramUser.firstName,
                  lastName: telegramUser.lastName || null,
                  username: telegramUser.username || null,
                  photoUrl: telegramUser.photoUrl || null,
                  referralCode: uniqueReferralCode,
                  referredBy: referralCode || null
                }),
              });
              
              if (createResponse.ok) {
                const newUser = await createResponse.json();
                console.log("UserContext - New user created:", newUser);
                setUser(newUser);
              } else {
                const errorData = await createResponse.json().catch(() => ({ message: 'Unknown error' }));
                console.error("UserContext - Create user API error:", errorData);
                throw new Error("Failed to create user: " + (errorData.message || createResponse.statusText));
              }
            } else {
              const errorText = await response.text().catch(() => 'Unknown error');
              console.error("UserContext - API error response:", errorText);
              throw new Error(`API error: ${response.status} - ${errorText}`);
            }
            
            setIsLoading(false);
            return;
          } catch (apiError) {
            console.error("UserContext - API error:", apiError);
            
            // API hatası durumunda development ortamında test kullanıcısı ile devam et
            if (isDevelopment) {
              console.log("UserContext - Using fallback user after API error");
              const fallbackUser = createFallbackUser();
              setUser(fallbackUser);
              setUseFallback(true);
              setIsLoading(false);
              return;
            }
          }
        } else {
          console.log("UserContext - No Telegram user data could be acquired directly");
        }
        
        // Doğrudan erişim başarısız olduysa veya API hatası olduysa, normal yöntemi deneyelim
        console.log("UserContext - Attempting Telegram authentication via library function");
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
        
        // Development ortamında ve 3 denemeden sonra hala başarısız
        if (isDevelopment) {
          console.log("Development ortamında fallback kullanıcısı kullanılıyor");
          const fallbackUser = createFallbackUser();
          setUser(fallbackUser);
          setUseFallback(true);
          setIsLoading(false);
          return;
        }
        
        // Üretim ortamında ve hala kullanıcı alınamadı
        throw new Error("Authentication failed after multiple attempts");
      } catch (err) {
        console.error("UserContext - Error initializing user:", err);
        setError("Failed to initialize user. Using fallback mode.");
        
        // Error durumunda sadece Development ortamında fallback kullanıcı oluştur
        if (isDevelopment) {
          console.log("UserContext - Creating fallback user after error");
          const fallbackUser = createFallbackUser();
          setUser(fallbackUser);
          setUseFallback(true);
        } else {
          // Üretim ortamında hata mesajı göster ve kullanıcı null bırak
          setError("Telegram kullanıcı bilgilerine erişilemedi. Lütfen tekrar deneyin.");
        }
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
