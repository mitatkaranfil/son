// Telegram Mini App SDK wrapper
import { getUserByTelegramId, createUser } from './api.ts';
import { nanoid } from 'nanoid';
import { User } from '@/types';

// Define WebApp interface based on Telegram documentation
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready(): void;
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
          };
          auth_date: number;
          hash: string;
        };
        sendData(data: string): void;
        expand(): void;
        close(): void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          show(): void;
          hide(): void;
          enable(): void;
          disable(): void;
          showProgress(leaveActive: boolean): void;
          hideProgress(): void;
          onClick(callback: () => void): void;
          offClick(callback: () => void): void;
          setText(text: string): void;
          setParams(params: {
            text?: string;
            color?: string;
            text_color?: string;
            is_active?: boolean;
            is_visible?: boolean;
          }): void;
        };
        BackButton: {
          isVisible: boolean;
          show(): void;
          hide(): void;
          onClick(callback: () => void): void;
          offClick(callback: () => void): void;
        };
        openLink(url: string): void;
        openTelegramLink(url: string): void;
        openInvoice(url: string, callback?: (status: string) => void): void;
        showPopup(params: {
          title?: string;
          message: string;
          buttons?: Array<{
            id: string;
            type?: "default" | "ok" | "close" | "cancel" | "destructive";
            text: string;
          }>;
        }, callback?: (buttonId: string) => void): void;
        showAlert(message: string, callback?: () => void): void;
        showConfirm(message: string, callback?: (isConfirmed: boolean) => void): void;
        HapticFeedback: {
          impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
          notificationOccurred(type: "error" | "success" | "warning"): void;
          selectionChanged(): void;
        };
        isVersionAtLeast(version: string): boolean;
        setHeaderColor(color: string): void;
        setBackgroundColor(color: string): void;
        enableClosingConfirmation(): void;
        disableClosingConfirmation(): void;
        onEvent(eventType: string, eventHandler: Function): void;
        offEvent(eventType: string, eventHandler: Function): void;
        setViewportHeight(height: number): void;
        requestViewport(): void;
        requestWriteAccess(callback?: (access_granted: boolean) => void): void;
        requestContact(callback?: (shared_contact: boolean) => void): void;
        CloudStorage: {
          getItem(key: string, callback?: (error: Error | null, value: string | null) => void): Promise<string | null>;
          setItem(key: string, value: string, callback?: (error: Error | null, success: boolean) => void): Promise<boolean>;
          removeItem(key: string, callback?: (error: Error | null, success: boolean) => void): Promise<boolean>;
          getItems(keys: string[], callback?: (error: Error | null, values: { [key: string]: string | null }) => void): Promise<{ [key: string]: string | null }>;
          removeItems(keys: string[], callback?: (error: Error | null, success: boolean) => void): Promise<boolean>;
          getKeys(callback?: (error: Error | null, keys: string[]) => void): Promise<string[]>;
        };
      };
    };
    // Alternatif Telegram WebApp API
    TelegramWebApp?: {
      ready(): void;
      expand(): void;
      close(): void;
      isExpanded: boolean;
      initDataUnsafe: any;
      initData: string;
      colorScheme: string;
      viewportHeight: number;
      viewportStableHeight: number;
      sendData(data: any): void;
      openLink(url: string): void;
      showAlert(message: string, callback?: Function): void;
      showConfirm(message: string, callback?: Function): void;
      MainButton: any;
      BackButton: any;
      onEvent(eventType: string, callback: Function): void;
      offEvent(eventType: string, callback: Function): void;
      version: string;
      platform: string;
      themeParams: any;
    };
  }
}

// Telegram özel API endpoint'leri
const TELEGRAM_API_ENDPOINT = '/api/telegram';

// URL parametrelerinden Telegram bilgileri var mı kontrol et
function getUrlParameter(name: string): string | null {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  const results = regex.exec(location.search);
  return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Telegram WebApp ortamında mı kontrolü
export function isTelegramWebApp(): boolean {
  try {
    // Farklı olası Telegram obje adlandırmalarını kontrol et
    const hasTelegram = !!window.Telegram;
    const hasTelegramLowercase = !!(window as any).telegram;
    const hasTelegramWebApp = !!(window as any).TelegramWebApp;
    
    // URL'de Telegram parametreleri olup olmadığını kontrol et
    const url = window.location.href;
    const hasTelegramParams = url.includes('tgWebAppData') || 
                             url.includes('tgWebAppVersion') || 
                             url.includes('tgWebAppPlatform');
    
    return hasTelegram || hasTelegramLowercase || hasTelegramWebApp || hasTelegramParams;
  } catch (error) {
    console.error('Error checking Telegram environment:', error);
    return false;
  }
}

// Telegram WebApp'i başlat
export function initializeTelegramApp(): void {
  try {
    console.log('Initializing Telegram WebApp...');
    
    // Telegram global objesi var mı kontrol et
    if (window.Telegram && window.Telegram.WebApp) {
      console.log('Telegram.WebApp found, expanding to fullscreen mode');
      
      // Ekranı genişlet
      window.Telegram.WebApp.expand();
      
      // Ana temayı ayarla
      document.documentElement.className = window.Telegram.WebApp.colorScheme === 'dark' 
        ? 'dark' 
        : 'light';
      
      // Toolbar ayarlarını yap
      window.Telegram.WebApp.BackButton.hide();
      window.Telegram.WebApp.MainButton.hide();
      
      // Yüklemeyi tamamla
      window.Telegram.WebApp.ready();
      
      console.log('Telegram.WebApp initialization completed');
    } else {
      console.log('Telegram.WebApp not found in window object');
    }
  } catch (error) {
    console.error('Error initializing Telegram WebApp:', error);
  }
}

// Get current Telegram user
export function getTelegramUser(forceTelegram: boolean = false): {
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
} | null {
  try {
    // Detaylı loglama ekleyelim
    console.log('--- getTelegramUser başlangıç ---');
    
    // Telegram WebApp kontrolü
    if (window.Telegram && window.Telegram.WebApp) {
      console.log('Telegram WebApp objesi bulundu');
      
      if (window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        console.log('Telegram user bilgileri:', JSON.stringify(user));
        
        return {
          telegramId: user.id.toString(),
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          photoUrl: user.photo_url
        };
      } else {
        console.warn('Telegram user bilgisi bulunamadı');
        
        // initData'dan kullanıcı bilgisi çıkarmayı dene
        if (window.Telegram.WebApp.initData) {
          try {
            const params = new URLSearchParams(window.Telegram.WebApp.initData);
            const userParam = params.get('user');
            if (userParam) {
              const userData = JSON.parse(userParam);
              console.log('initData\'dan parse edilen kullanıcı:', userData);
              
              return {
                telegramId: userData.id.toString(),
                firstName: userData.first_name || userData.firstName,
                lastName: userData.last_name || userData.lastName,
                username: userData.username,
                photoUrl: userData.photo_url || userData.photoUrl
              };
            }
          } catch (parseErr) {
            console.error('initData parse hatası:', parseErr);
          }
        }
      }
    } else {
      console.warn('Telegram WebApp objesi bulunamadı');
    }
    
    // Alternatif Telegram API kontrolü
    if (window.TelegramWebApp) {
      console.log('Alternatif TelegramWebApp objesi bulundu');
      
      if (window.TelegramWebApp.initDataUnsafe && window.TelegramWebApp.initDataUnsafe.user) {
        const user = window.TelegramWebApp.initDataUnsafe.user;
        console.log('Alternatif Telegram user bilgileri:', JSON.stringify(user));
        
        return {
          telegramId: user.id.toString(),
          firstName: user.first_name || user.firstName,
          lastName: user.last_name || user.lastName,
          username: user.username,
          photoUrl: user.photo_url || user.photoUrl
        };
      } else {
        console.warn('Alternatif Telegram user bilgisi bulunamadı');
      }
    } else {
      console.warn('Alternatif TelegramWebApp objesi bulunamadı');
    }
    
    // URL'den kullanıcı bilgilerini almayı dene
    const tgWebAppUser = getUrlParameter('user');
    if (tgWebAppUser) {
      try {
        const userData = JSON.parse(decodeURIComponent(tgWebAppUser));
        console.log('URL\'den parse edilen kullanıcı:', userData);
        
        if (userData && userData.id) {
          return {
            telegramId: userData.id.toString(),
            firstName: userData.first_name || userData.firstName || "User",
            lastName: userData.last_name || userData.lastName,
            username: userData.username,
            photoUrl: userData.photo_url || userData.photoUrl
          };
        }
      } catch (urlParseError) {
        console.error('URL kullanıcı veri parse hatası:', urlParseError);
      }
    }
    
    console.log('--- Development ortamı kontrolü ---');
    // Test modunda mıyız?
    const isDevelopment = import.meta.env.DEV;
    
    // ForceTelegram veya development ortamında fallback kullanıcısı kullan
    if (forceTelegram || isDevelopment) {
      console.log('ForceTelegram veya development ortamı: Test kullanıcısı oluşturuluyor');
      const testUser = {
        telegramId: "123456789",
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        photoUrl: "https://via.placeholder.com/100"
      };
      return testUser;
    }
    
    // Üretim ortamında ve kullanıcı bulunamadı
    console.warn('Üretim ortamında ve Telegram kullanıcısı bulunamadı');
    console.log('--- getTelegramUser bitiş ---');
    return null;
  } catch (error) {
    console.error('Error getting Telegram user:', error);
    return null;
  }
}

// Authenticate with backend and get or create user
export async function authenticateTelegramUser(referralCode?: string, forceTelegram: boolean = false): Promise<User | null> {
  try {
    console.log("Authenticating Telegram user...");
    
    // Check if we are in Telegram WebApp environment
    const isTelegram = isTelegramWebApp();
    console.log("In Telegram WebApp environment:", isTelegram);
    
    // If not in Telegram environment and not forcing Telegram auth, return null
    if (!isTelegram && !forceTelegram) {
      console.log("Not in Telegram WebApp and not forcing Telegram auth.");
      return null;
    }
    
    // Get user directly from Telegram WebApp
    let telegramUser = getTelegramUser();
    
    if (!telegramUser) {
      console.warn("Failed to get user from Telegram WebApp, falling back to demo user");
      return null;
    }
    
    console.log("Got Telegram user:", telegramUser);
    
    // Check if user exists in our database
    try {
      const existingUser = await fetch(`${TELEGRAM_API_ENDPOINT}/user/${telegramUser.telegramId}`)
        .then(res => {
          if (res.ok) return res.json();
          if (res.status === 404) return null;
          throw new Error(`Failed to check user: ${res.status}`);
        });
      
      console.log("Existing user check:", existingUser ? "Found" : "Not found");
      
      if (existingUser) {
        console.log("User exists, returning");
        return existingUser;
      }
      
      // User doesn't exist, create new user
      console.log("Creating new user");
      
      const referralData = referralCode ? { referredBy: referralCode } : {};
      const userData = {
        ...telegramUser,
        ...referralData,
        referralCode: generateReferralCode(),
      };
      
      const createdUser = await fetch(`${TELEGRAM_API_ENDPOINT}/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      }).then(res => {
        if (res.ok) return res.json();
        throw new Error(`Failed to create user: ${res.status}`);
      });
      
      console.log("User created:", createdUser);
      return createdUser;
    } catch (error) {
      console.error("Error authenticating with backend:", error);
      return null;
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

// Generate a unique referral code
function generateReferralCode(length = 6): string {
  // Generate a random alpha-numeric code
  return nanoid(length);
}

// Show an alert using Telegram's native UI
export function showAlert(message: string): void {
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.showAlert(message);
    } else {
      alert(message);
    }
  } catch (error) {
    console.error('Error showing alert:', error);
    alert(message);
  }
}

// Show a confirmation dialog using Telegram's native UI
export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Check if window.Telegram exists
    const hasTelegram = typeof window !== 'undefined' && !!window.Telegram?.WebApp;
    
    // Check if window.TelegramWebApp exists (alternative API)
    const hasTelegramWebApp = typeof window !== 'undefined' && !!window.TelegramWebApp;
    
    if (hasTelegram) {
      window.Telegram.WebApp.showConfirm(message, (isConfirmed) => {
        resolve(isConfirmed);
      });
    } else if (hasTelegramWebApp && window.TelegramWebApp) {
      window.TelegramWebApp.showConfirm(message, (isConfirmed: boolean) => {
        resolve(isConfirmed);
      });
    } else {
      const result = confirm(message);
      resolve(result);
    }
  });
}

// Open a Telegram channel or group
export function openTelegramLink(link: string): void {
  try {
    console.log('Opening Telegram link:', link);
    
    // Make sure the link is properly formatted
    if (!link.startsWith('https://t.me/')) {
      // Handle links that start with @
      if (link.startsWith('@')) {
        link = 'https://t.me/' + link.substring(1);
      } else {
        link = 'https://t.me/' + link;
      }
    }
    
    console.log('Formatted link:', link);
    
    if (isTelegramWebApp() && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openLink(link);
    } else {
      window.open(link, '_blank');
    }
  } catch (error) {
    console.error('Error opening Telegram link:', error);
    
    // Fallback
    try {
      window.open(link, '_blank');
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
    }
  }
}

// Handle payment using Telegram's payment API
export function openInvoice(url: string): Promise<string> {
  return new Promise((resolve) => {
    if (isTelegramWebApp()) {
      window.Telegram.WebApp.openInvoice(url, (status) => {
        resolve(status);
      });
    } else {
      console.warn('Telegram payment not available outside WebApp');
      resolve('failed');
    }
  });
}

// Share data with Telegram (like referral code)
export function shareWithTelegram(data: string): void {
  if (isTelegramWebApp()) {
    try {
      if (typeof data === 'string') {
        // Check if the data appears to be a message (not a JSON object)
        const isMessage = data.includes(' ') || (!data.startsWith('{') && !data.startsWith('['));
        
        if (isMessage) {
          // It's a message, use openLink to open the share dialog
          console.log('Sharing message using Telegram share dialog');
          const encodedText = encodeURIComponent(data);
          const shareUrl = `https://t.me/share/url?url=&text=${encodedText}`;
          window.Telegram.WebApp.openLink(shareUrl);
        } else {
          // It's likely a JSON object, use sendData
          console.log('Sending data to Telegram Bot');
          window.Telegram.WebApp.sendData(data);
        }
      } else {
        // Fallback to sendData for any other case
        console.log('Sending data to Telegram Bot (fallback)');
        window.Telegram.WebApp.sendData(data);
      }
    } catch (error) {
      console.error('Error sharing with Telegram:', error);
    }
  } else {
    console.warn('Sharing not available outside WebApp');
  }
}

// Request a contact from user
export function requestContact(): Promise<boolean> {
  return new Promise((resolve) => {
    if (isTelegramWebApp()) {
      window.Telegram.WebApp.requestContact((shared) => {
        resolve(shared);
      });
    } else {
      console.warn('Contact request not available outside WebApp');
      resolve(false);
    }
  });
}

// Provide haptic feedback
export function hapticFeedback(type: 'success' | 'error' | 'warning'): void {
  if (isTelegramWebApp()) {
    window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
  }
}

// Close the WebApp
export function closeWebApp(): void {
  if (isTelegramWebApp()) {
    window.Telegram.WebApp.close();
  }
}

// Telegram API kontrol işlevi - API'nin çalışıp çalışmadığını kontrol eder
export async function checkTelegramAPI() {
  try {
    console.log('TelegramApp - Checking API connectivity...');
    const response = await fetch('/api/telegram/check');
    const contentType = response.headers.get('content-type');
    
    // HTML yanıtı kontrolü
    if (contentType && contentType.includes('text/html')) {
      console.error('TelegramApp - API returned HTML instead of JSON. API endpoint may be misconfigured.');
      const htmlContent = await response.text();
      console.error('HTML Response:', htmlContent.substring(0, 200) + '...');
      return false;
    }
    
    if (!response.ok) {
      console.error(`TelegramApp - API check failed with status: ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    console.log('TelegramApp - API check successful:', data);
    return true;
  } catch (error) {
    console.error('TelegramApp - API check error:', error);
    return false;
  }
}
