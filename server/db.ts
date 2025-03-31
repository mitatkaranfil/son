import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';
import { sql } from 'drizzle-orm';

// Konsola bilgi yazdırma fonksiyonu
export function log(message: string) {
  const date = new Date().toLocaleString();
  console.log(`[${date}] [DB] ${message}`);
}

// Neon PostgreSQL veritabanı URL'ini al
const databaseUrl = process.env.DATABASE_URL || 'postgres://default:password@localhost:5432/cosmodb';

// SQL bağlantısı oluştur
let sqlConnection: any;

try {
    // Neon bağlantı yapılandırması
    sqlConnection = neon(databaseUrl);
    log('SQL bağlantısı oluşturuldu');
} catch (error) {
    log(`SQL bağlantısı oluşturulurken hata: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
}

// Drizzle örneğini oluştur
export const db = drizzle(sqlConnection, { schema });

// Migration fonksiyonu
export async function createTables() {
  try {
    log('Tabloları oluşturma işlemi başlatılıyor...');
    
    // Tabloları sırayla oluştur
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${schema.users} (
        id SERIAL PRIMARY KEY,
        telegram_id TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT,
        username TEXT,
        photo_url TEXT,
        level INTEGER NOT NULL DEFAULT 1,
        points INTEGER NOT NULL DEFAULT 0,
        mining_speed INTEGER NOT NULL DEFAULT 10,
        last_mining_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        referral_code TEXT NOT NULL UNIQUE,
        referred_by TEXT,
        join_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        completed_tasks_count INTEGER NOT NULL DEFAULT 0,
        boost_usage_count INTEGER NOT NULL DEFAULT 0,
        role ${schema.userRoleEnum} NOT NULL DEFAULT 'user',
        password TEXT
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${schema.tasks} (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type ${schema.taskTypeEnum} NOT NULL,
        points INTEGER NOT NULL,
        required_amount INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT true,
        telegram_action TEXT,
        telegram_target TEXT
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${schema.userTasks} (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES ${schema.users}(id),
        task_id INTEGER NOT NULL REFERENCES ${schema.tasks}(id),
        progress INTEGER NOT NULL DEFAULT 0,
        is_completed BOOLEAN NOT NULL DEFAULT false,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${schema.boostTypes} (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        multiplier INTEGER NOT NULL,
        duration_hours INTEGER NOT NULL,
        price INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        icon_name TEXT NOT NULL DEFAULT 'rocket',
        color_class TEXT NOT NULL DEFAULT 'blue',
        is_popular BOOLEAN NOT NULL DEFAULT false
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${schema.userBoosts} (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES ${schema.users}(id),
        boost_type_id INTEGER NOT NULL REFERENCES ${schema.boostTypes}(id),
        start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${schema.referrals} (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER NOT NULL REFERENCES ${schema.users}(id),
        referred_id INTEGER NOT NULL REFERENCES ${schema.users}(id),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    log('Tablolar başarıyla oluşturuldu');
    return true;
  } catch (error) {
    log(`Tablo oluşturma hatası: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// Veritabanını başlat
export async function initializeDatabase() {
  try {
    // Bağlantıyı test et
    const result = await sqlConnection`SELECT 1 as test`;
    if (result[0]?.test === 1) {
      log('Veritabanı bağlantısı başarılı');
    } else {
      throw new Error('Veritabanı bağlantısı başarısız');
    }

    // Tabloları oluştur
    await createTables();

    // Tabloların oluşturulduğunu doğrula
    const tables = await sqlConnection`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    log('Oluşturulan tablolar:', tables.map(t => t.table_name));
    return true;
  } catch (error) {
    log(`Veritabanı başlatılamadı: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// Initialize database connection
initializeDatabase().then(success => {
  if (success) {
    log('Veritabanı başarıyla başlatıldı');
  } else {
    log('Veritabanı başlatılamadı, ancak uygulama çalışmaya devam edecek');
  }
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