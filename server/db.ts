import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

// Konsola bilgi yazdırma fonksiyonu
export function log(message: string, ...args: any[]) {
  const date = new Date().toLocaleString();
  console.log(`[${date}] [DB] ${message}`, ...args);
}

// Supabase URL ve Anahtar'ı al
const supabaseUrl = 'https://lfalfdmfehcwnnqxkycj.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  throw new Error('SUPABASE_KEY ortam değişkeni tanımlanmalıdır');
}

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
            points INTEGER DEFAULT 0,
            referral_code TEXT UNIQUE,
            referred_by TEXT,
            role TEXT DEFAULT 'user',
            password TEXT,
            last_mining_time TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);
      
      if (createError) {
        throw createError;
      }
      
      log('Users tablosu başarıyla oluşturuldu');
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

// ES modülleri için ana modül kontrolü (require.main === module yerine)
// Bu kısmı kaldırdık, çünkü ES modüllerinde bu tür otomatik çalıştırma için
// farklı bir yaklaşım kullanmamız gerekiyor.
// Bunun yerine, diğer modüllerin setupDatabase() fonksiyonunu çağırarak
// veritabanını başlatmasını sağlayacağız.