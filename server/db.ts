import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';

// Konsola bilgi yazdırma fonksiyonu
export function log(message: string) {
  const date = new Date().toLocaleString();
  console.log(`[${date}] [DB] ${message}`);
}

// Neon PostgreSQL veritabanı URL'ini al
const databaseUrl = process.env.DATABASE_URL || 'postgres://default:password@localhost:5432/cosmodb';

// SQL bağlantısı oluştur
let sqlConnection = neon(databaseUrl);

// Drizzle örneğini oluştur
export const db = drizzle(sqlConnection, { schema });

// Connection retry logic
async function initializeDatabase() {
  let retryCount = 0;
  const maxRetries = 3;
  
  async function connectWithRetry() {
    try {
      retryCount++;
      log(`Veritabanına bağlanılıyor (deneme ${retryCount}/${maxRetries})...`);
      
      // Test connection
      const result = await sqlConnection`SELECT 1 as test`;
      if (result[0]?.test === 1) {
        log('Veritabanı bağlantısı başarılı');
        return true;
      } else {
        throw new Error('Veritabanı yanıt verdi ancak beklenen sonuç alınamadı');
      }
    } catch (error) {
      log(`Veritabanı bağlantı hatası: ${error instanceof Error ? error.message : String(error)}`);
      
      if (retryCount < maxRetries) {
        const delay = retryCount * 1000; // Her seferinde biraz daha fazla bekle
        log(`${delay}ms sonra yeniden denenecek...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return connectWithRetry();
      } else {
        log('Maksimum deneme sayısına ulaşıldı, veritabanı bağlantısı başarısız');
        return false;
      }
    }
  }
  
  try {
    log('Veritabanı bağlantısı oluşturuluyor...');
    const success = await connectWithRetry();
    
    if (!success) {
      log('Veritabanı bağlantısı başarısız, ancak uygulama çalışmaya devam edecek');
    }
    
    return success;
  } catch (error) {
    console.error('Veritabanı bağlantısı oluşturulamadı:', error);
    return false;
  }
}

// Initialize database connection
initializeDatabase().then(success => {
  if (success) {
    log('Veritabanı başarıyla başlatıldı');
  } else {
    log('UYARI: Veritabanı başlatılamadı, uygulamanın bazı özellikleri çalışmayabilir');
  }
}).catch(err => {
  console.error('Kritik hata: Veritabanı başlatılamadı:', err);
});

// Veritabanı bağlantısını test et
export async function testConnection() {
  try {
    log('Veritabanı bağlantısı test ediliyor...');
    const result = await sqlConnection`SELECT NOW()`;
    log(`Veritabanı bağlantısı başarılı: ${result[0].now}`);
    return true;
  } catch (error) {
    log(`Veritabanı bağlantı hatası: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
} 