import { useEffect, useState } from "react";
import { UserProvider } from "@/context/UserContext";
import Home from "@/pages/home";
import { initializeTelegramApp, isTelegramWebApp } from "@/lib/telegram";
import LoadingScreen from "@/components/LoadingScreen";

export default function TelegramApp() {
  const [initComplete, setInitComplete] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  
  // API durumunu kontrol et
  useEffect(() => {
    const checkApi = async () => {
      try {
        const response = await fetch('/api/telegram/check');
        if (response.ok) {
          const data = await response.json();
          console.log("TelegramApp - API check result:", data);
          setApiOnline(true);
        } else {
          console.error("TelegramApp - API check failed:", response.status);
          setApiOnline(false);
        }
      } catch (error) {
        console.error("TelegramApp - API check error:", error);
        setApiOnline(false);
      }
    };
    
    checkApi();
  }, []);
  
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
  
  if (!apiOnline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">API Bağlantı Hatası</h1>
          <p className="text-gray-300">
            Sunucu ile bağlantı kurulamadı. Lütfen tekrar deneyin veya daha sonra tekrar ziyaret edin.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            Yenile
          </button>
        </div>
      </div>
    );
  }

  return (
    <UserProvider telegramMode={true}>
      <Home />
    </UserProvider>
  );
} 