import React, { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, useLocation } from "wouter";
import { UserProvider } from "./context/UserContext";
import { ToastProvider } from "./context/ToastContext";
import Home from "./pages/home";
import TelegramApp from "./pages/telegram";
import Dashboard from "./pages/dashboard";
import Tasks from "./pages/tasks";
import Boosts from "./pages/boosts";
import Profile from "./pages/profile";
import Admin from "./pages/admin";
import Login from "./pages/login";
import NotFound from "./pages/not-found";
import { isTelegramWebApp, initializeTelegramApp } from "./lib/telegram";

function App() {
  const [location, setLocation] = useLocation();
  
  // Telegram web uygulaması mı kontrolü
  const isTelegram = isTelegramWebApp();
  
  useEffect(() => {
    console.log("App component mounted");
    console.log("Current location:", location);
    
    // URL'den Telegram WebApp kontrolü
    const url = window.location.href;
    const isTelegramPath = location === '/telegram';
    const hasWebAppParams = url.includes('tgWebAppData') || url.includes('tgWebAppVersion');
    
    console.log("Is Telegram WebApp:", isTelegram);
    console.log("Is Telegram path:", isTelegramPath);
    console.log("Has WebApp params:", hasWebAppParams);
    
    // Telegram parametreleri var ama /telegram rotasında değilse yönlendir
    if ((isTelegram || hasWebAppParams) && !isTelegramPath) {
      console.log("Redirecting to /telegram");
      setLocation("/telegram");
    }
    
    // Telegram WebApp ayarlarını başlat
    if (isTelegram || isTelegramPath) {
      initializeTelegramApp();
    }
  }, [location, setLocation, isTelegram]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <UserProvider telegramMode={location === '/telegram'}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/telegram" component={TelegramApp} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/tasks" component={Tasks} />
            <Route path="/boosts" component={Boosts} />
            <Route path="/profile" component={Profile} />
            <Route path="/admin" component={Admin} />
            <Route path="/login" component={Login} />
            <Route component={NotFound} />
          </Switch>
        </UserProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
