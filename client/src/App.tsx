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

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        console.log(`App initialization attempt ${retryCount + 1}`);
        
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
