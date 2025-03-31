import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/context/UserContext";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import TelegramApp from "@/pages/telegram";
import LoadingScreen from "@/components/LoadingScreen";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={Admin} />
      <Route path="/telegram" component={TelegramApp} />
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

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize app 
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading) {
    return <LoadingScreen message="Uygulama yükleniyor..." />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <main className="app">
          <Router />
          <Toaster />
        </main>
      </UserProvider>
    </QueryClientProvider>
  );
}
