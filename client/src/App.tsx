import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/context/UserContext";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import LoadingScreen from "@/components/LoadingScreen";
import { initializeTelegramApp } from "./lib/telegram";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

// URL parametrelerinden Telegram verilerini kontrol et
function checkTelegramParams() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    console.log("URL parametreleri kontrol ediliyor...");
    
    // Telegram WebApp parametresi var mı?
    const tgWebAppData = urlParams.get('tgWebAppData');
    const tgWebAppVersion = urlParams.get('tgWebAppVersion');
    
    if (tgWebAppData) {
      console.log("tgWebAppData parametresi bulundu!");
      console.log("tgWebAppVersion:", tgWebAppVersion);
      
      // URL'deki data'yı parse etmeye çalış
      try {
        const decodedData = decodeURIComponent(tgWebAppData);
        console.log("Decoded tgWebAppData:", decodedData);
      } catch (e) {
        console.warn("tgWebAppData parse edilemedi:", e);
      }
      
      return true;
    } else {
      console.log("URL'de Telegram parametreleri bulunamadı");
      return false;
    }
  } catch (error) {
    console.error("URL parametreleri kontrol edilirken hata:", error);
    return false;
  }
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        console.log(`App initialization attempt ${retryCount + 1}`);
        
        // URL parametrelerini kontrol et
        const hasTelegramParams = checkTelegramParams();
        
        // Test modu parametresi
        const urlParams = new URLSearchParams(window.location.search);
        const testMode = urlParams.get('forceTestUser') === 'true';
        if (testMode) {
          console.log("TestMode enabled via URL parameter");
        }
        
        // Telegram WebApp kontrolü
        if (window.Telegram && window.Telegram.WebApp) {
          console.log("Telegram WebApp bulundu!");
          // Her ne kadar TypeScript bunu tanımasa da platform özelliği var
          if ('platform' in window.Telegram.WebApp) {
            console.log("Telegram Platform:", (window.Telegram.WebApp as any).platform);
          }
          
          // Kullanıcı bilgilerini kontrol et
          if (window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
            console.log("Telegram User:", JSON.stringify(window.Telegram.WebApp.initDataUnsafe.user));
          } else {
            console.warn("Telegram kullanıcı bilgisi bulunamadı");
          }
        } else {
          console.warn("Telegram WebApp bulunamadı, geliştirme ortamında olabilirsiniz");
        }
        
        // Initialize Telegram WebApp
        initializeTelegramApp();
        
        // Kısa bir gecikme ekleyelim
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log("App initialization complete");
        setIsInitialized(true);
        setInitError(null);
      } catch (error) {
        console.error("Failed to initialize app:", error);
        setInitError("Uygulama başlatılırken bir hata oluştu");
        
        // Automatically retry up to 2 times
        if (retryCount < 2) {
          console.log(`Will retry initialization in 2 seconds (attempt ${retryCount + 1}/3)`);
          setTimeout(() => setRetryCount(prev => prev + 1), 2000);
        } else {
          // After 3 failed attempts, just proceed with the app anyway
          console.log("Max retries exceeded, proceeding anyway");
          setIsInitialized(true);
        }
      }
    };

    init();
  }, [retryCount]);

  // If we're still initializing, show loading screen
  if (!isInitialized) {
    return (
      <LoadingScreen 
        message={initError ? `${initError}. Yeniden deneniyor...` : "Uygulama yükleniyor..."} 
      />
    );
  }

  // Proceed with the app
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <Router />
        <Toaster />
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
