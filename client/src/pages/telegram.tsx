import React, { useState, useEffect } from 'react';
import useUser from '@/hooks/useUser';
import LoadingScreen from '@/components/LoadingScreen';
import { initializeTelegramApp } from '@/lib/telegram';
import { checkTelegramAPI } from '@/lib/telegram';
import { Link, Route, Switch, useLocation } from 'wouter';

// Sayfa bileşenleri
import Home from './home';

// Placeholder bileşenler (sonradan gerçek bileşenlerle değiştirilebilir)
const Dashboard = () => (
  <div className="p-4">
    <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
    <p>Kullanıcı panosu içeriği burada gösterilecek.</p>
    <div className="mt-4">
      <Link href="/telegram/tasks">
        <a className="px-4 py-2 bg-blue-500 text-white rounded mr-2">Görevler</a>
      </Link>
      <Link href="/telegram/boosts">
        <a className="px-4 py-2 bg-green-500 text-white rounded mr-2">Boostlar</a>
      </Link>
      <Link href="/telegram/profile">
        <a className="px-4 py-2 bg-purple-500 text-white rounded">Profil</a>
      </Link>
    </div>
  </div>
);

const Tasks = () => (
  <div className="p-4">
    <h1 className="text-2xl font-bold mb-4">Görevler</h1>
    <p>Kullanıcı görevleri burada listelenecek.</p>
    <div className="mt-4">
      <Link href="/telegram/dashboard">
        <a className="px-4 py-2 bg-gray-500 text-white rounded">Dashboard'a Dön</a>
      </Link>
    </div>
  </div>
);

const Boosts = () => (
  <div className="p-4">
    <h1 className="text-2xl font-bold mb-4">Boostlar</h1>
    <p>Kullanıcı boostları burada listelenecek.</p>
    <div className="mt-4">
      <Link href="/telegram/dashboard">
        <a className="px-4 py-2 bg-gray-500 text-white rounded">Dashboard'a Dön</a>
      </Link>
    </div>
  </div>
);

const Profile = () => (
  <div className="p-4">
    <h1 className="text-2xl font-bold mb-4">Profil</h1>
    <p>Kullanıcı profil bilgileri burada gösterilecek.</p>
    <div className="mt-4">
      <Link href="/telegram/dashboard">
        <a className="px-4 py-2 bg-gray-500 text-white rounded">Dashboard'a Dön</a>
      </Link>
    </div>
  </div>
);

const TelegramApp: React.FC = () => {
  const { user, isLoading, error } = useUser();
  const [location, setLocation] = useLocation();

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
    
    // Eğer kullanıcı kimliği doğrulanmışsa ve alt sayfa belirtilmemişse, 
    // kullanıcıyı dashboard'a yönlendir
    if (user && location === '/telegram') {
      setLocation('/telegram/dashboard');
    }
  }, [user, isLoading, error, location, setLocation]);

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

  // Kimlik doğrulama başarılı ise içerik sayfasını göster
  return (
    <div className="telegram-app">
      <Switch>
        <Route path="/telegram" component={Dashboard} />
        <Route path="/telegram/dashboard" component={Dashboard} />
        <Route path="/telegram/tasks" component={Tasks} />
        <Route path="/telegram/boosts" component={Boosts} />
        <Route path="/telegram/profile" component={Profile} />
      </Switch>
    </div>
  );
};

export default TelegramApp; 