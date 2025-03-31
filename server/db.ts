import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modülleri için dizin yolunu al ve .env dosyasını yükle
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // .env dosyasını doğrudan belirterek yükle
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  console.log('Ortam değişkenleri yüklendi, SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Mevcut' : 'Eksik');
} catch (error) {
  console.log('dotenv yükleme hatası:', error);
}

// Konsola bilgi yazdırma fonksiyonu
export function log(message: string, ...args: any[]) {
  const date = new Date().toLocaleString();
  console.log(`[${date}] [DB] ${message}`, ...args);
}

// Sabit Supabase bilgileri (ortam değişkenleri bulunamazsa)
const supabaseUrl = process.env.SUPABASE_URL || 'https://lfalfdmfehcwnnqxkycj.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmYWxmZG1mZWhjd25ucXhreWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NDA5NTYsImV4cCI6MjA1OTAxNjk1Nn0.Uh0-GS11EogXWyIf05f4ORk3PqITmEd3cPHMekjcFTs';

// Supabase istemcisini oluştur
export const supabase = createClient(supabaseUrl, supabaseKey);

// Migration fonksiyonu - SQL query doğrudan kullanarak
export async function createTables() {
  try {
    log('Tabloları oluşturma işlemi başlatılıyor...');
    
    // SQL ile doğrudan oluştur
    const { error } = await supabase.from('users').select('count').limit(1);
    
    if (error && error.code === '42P01') { // Tablo bulunamadı hatası
      log('Users tablosu bulunamadı, oluşturuluyor...');
      
      // PostgreSQL SQL Query kullanarak tablo oluştur
      const { error: createError } = await supabase
        .query(`
          CREATE TABLE IF NOT EXISTS public.users (
            id SERIAL PRIMARY KEY,
            telegram_id TEXT UNIQUE,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            firstname TEXT,
            lastname TEXT,
            points INTEGER DEFAULT 0,
            referral_code TEXT UNIQUE,
            referred_by TEXT,
            role TEXT DEFAULT 'user',
            password TEXT,
            last_mining_time TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS public.tasks (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            reward INTEGER NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'special')),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS public.user_tasks (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES public.users(id),
            task_id INTEGER REFERENCES public.tasks(id),
            progress INTEGER DEFAULT 0,
            is_completed BOOLEAN DEFAULT false,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, task_id)
          );
          
          CREATE TABLE IF NOT EXISTS public.boost_types (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            multiplier FLOAT NOT NULL,
            duration_hours INTEGER NOT NULL,
            cost INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS public.user_boosts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES public.users(id),
            boost_type_id INTEGER REFERENCES public.boost_types(id),
            starts_at TIMESTAMP DEFAULT NOW(),
            ends_at TIMESTAMP NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS public.referrals (
            id SERIAL PRIMARY KEY,
            referrer_id INTEGER REFERENCES public.users(id),
            referred_id INTEGER REFERENCES public.users(id),
            bonus_given BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(referrer_id, referred_id)
          );
        `);
      
      if (createError) {
        throw createError;
      }
      
      log('Tablolar başarıyla oluşturuldu');
    } else if (error) {
      throw error;
    } else {
      log('Users tablosu zaten mevcut');
    }
    
    log('Tablo işlemleri başarıyla tamamlandı');
    return true;
  } catch (error) {
    log(`Tablo oluşturma hatası: ${JSON.stringify(error, null, 2)}`);
    return false;
  }
}

// Veritabanını başlat
export async function initializeDatabase() {
  try {
    log('Veritabanı başlatılıyor...');
    
    // Tabloları oluştur
    const tablesCreated = await createTables();
    if (!tablesCreated) {
      throw new Error('Tablolar oluşturulamadı');
    }
    
    // Users tablosunu kontrol et
    const { data, error } = await supabase
      .from('users')
      .select('count');
    
    if (error) {
      throw error;
    }
    
    log('Veritabanı başarıyla başlatıldı');
    return true;
  } catch (error) {
    log(`Veritabanı başlatılamadı: ${JSON.stringify(error, null, 2)}`);
    throw new Error('Veritabanı başlatılamadı');
  }
}

// Bağlantıyı test et
export async function testConnection() {
  try {
    log('Veritabanı bağlantısı test ediliyor...');
    
    // Supabase bağlantısını test et
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    log('Veritabanı bağlantısı başarılı');
    return true;
  } catch (error) {
    log(`Veritabanı bağlantısı hatası: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// Database başlatma işlemini başlat
export function setupDatabase() {
  return initializeDatabase()
    .then(() => {
      log('Veritabanı başarıyla başlatıldı');
      return true;
    })
    .catch(error => {
      log('Veritabanı başlatılamadı, ancak uygulama çalışmaya devam edecek');
      console.error(error);
      return false;
    });
}