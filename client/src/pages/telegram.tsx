import { useEffect, useState } from "react";
import { UserProvider } from "@/context/UserContext";
import Home from "@/pages/home";
import { initializeTelegramApp, isTelegramWebApp } from "@/lib/telegram";
import LoadingScreen from "@/components/LoadingScreen";

export default function TelegramApp() {
  const [initComplete, setInitComplete] = useState(false);
  
  // Telegram uygulamasını başlat
  useEffect(() => {
    console.log("TelegramApp - Initializing Telegram integration");
    try {
      // Telegram init işlemini çağır
      initializeTelegramApp();
      
      // Telegram WebApp ortamında olup olmadığımızı kontrol et
      const isTelegram = isTelegramWebApp();
      console.log("TelegramApp - Is in Telegram WebApp environment:", isTelegram);
      
      // URL parametrelerini kontrol et
      const params = new URLSearchParams(window.location.search);
      console.log("TelegramApp - URL parameters:", Object.fromEntries(params.entries()));
      
      // 500ms sonra tamamen yüklenmiş olacak
      setTimeout(() => {
        setInitComplete(true);
      }, 500);
    } catch (err: any) {
      console.error("TelegramApp - Error initializing Telegram:", err?.message || "Unknown error");
      setInitComplete(true); // Hata olsa da işlemi tamamla
    }
  }, []);

  if (!initComplete) {
    return <LoadingScreen message="Telegram bağlantısı kuruluyor..." />;
  }

  return (
    <UserProvider telegramMode={true}>
      <Home />
    </UserProvider>
  );
} 