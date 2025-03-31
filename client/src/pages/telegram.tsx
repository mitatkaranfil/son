import { useEffect } from "react";
import { UserProvider } from "@/context/UserContext";
import Home from "@/pages/home";
import { initializeTelegramApp } from "@/lib/telegram";
import LoadingScreen from "@/components/LoadingScreen";

export default function TelegramApp() {
  // Telegram uygulamasını başlat
  useEffect(() => {
    console.log("TelegramApp - Initializing Telegram integration");
    try {
      initializeTelegramApp();
    } catch (err: any) {
      console.error("TelegramApp - Error initializing Telegram:", err?.message || "Unknown error");
    }
  }, []);

  return (
    <UserProvider telegramMode={true}>
      <Home />
    </UserProvider>
  );
} 