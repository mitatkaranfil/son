import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';

// Neon PostgreSQL veritabanı URL'ini al ve havuzu oluştur
const databaseUrl = process.env.DATABASE_URL || 'postgres://default:password@localhost:5432/cosmodb';
const sql = neon(databaseUrl);

// Drizzle örneğini oluştur
export const db = drizzle(sql, { schema });

// Konsola bilgi yazdırma fonksiyonu
export function log(message: string) {
  const date = new Date().toLocaleString();
  console.log(`[${date}] [DB] ${message}`);
}

// Veritabanı bağlantısını test et
export async function testConnection() {
  try {
    log('Veritabanı bağlantısı test ediliyor...');
    const result = await sql`SELECT NOW()`;
    log(`Veritabanı bağlantısı başarılı: ${result[0].now}`);
    return true;
  } catch (error) {
    log(`Veritabanı bağlantı hatası: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
} 