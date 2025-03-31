import React, { useEffect } from 'react';
import useUser from '@/hooks/useUser';
import Home from './home';
import LoadingScreen from '@/components/LoadingScreen';
import { initializeTelegramApp } from '@/lib/telegram';
import { checkTelegramAPI } from '@/lib/telegram';

const TelegramApp: React.FC = () => {
  const { user, isLoading, error } = useUser();

  useEffect(() => {
    console.log('TelegramApp page mounted');
    
    // Initialize Telegram WebApp features
    initializeTelegramApp();
    
    // Check API connectivity
    const checkAPI = async () => {
      const apiWorking = await checkTelegramAPI();
      if (!apiWorking) {
        console.error('TelegramApp - API check failed, user experience may be affected');
      }
    };
    
    checkAPI();
    
    // Log user state
    console.log('TelegramApp - User state:', { user, isLoading, error });
  }, [user, isLoading, error]);

  if (isLoading) {
    return <LoadingScreen message="Telegram kullanıcı bilgileri alınıyor..." />;
  }

  if (error) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Bağlantı Hatası</h1>
        <p className="mb-6">{error}</p>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          onClick={() => window.location.reload()}
        >
          Yeniden Dene
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-screen flex items-center justify-center p-4 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">Kullanıcı Bulunamadı</h1>
          <p className="mb-4 text-gray-700">
            Telegram kullanıcı bilgilerinize erişilemedi. Lütfen uygulamayı Telegram üzerinden açtığınızdan emin olun.
          </p>
          <p className="mb-6 text-sm text-gray-500">
            Telegram WebApp API'si üzerinden kullanıcı bilgileri alınamadığında uygulama çalışamaz.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Yeniden Dene
          </button>
        </div>
      </div>
    );
  }

  // Redirect to dashboard if authentication was successful
  return <Home />;
};

export default TelegramApp; 