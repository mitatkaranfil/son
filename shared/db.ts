import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection pool oluşturma
const connectionString = process.env.DATABASE_URL || '';
const queryClient = postgres(connectionString, {
  max: 10, // Maksimum bağlantı sayısı
  idle_timeout: 20, // 20 saniye sonra havuza iade edilir
  connect_timeout: 10, // 10 saniye sonra bağlantı zaman aşımına uğrar
  prepare: false, // Prepared statements kullanımını devre dışı bırak (performans artışı için)
});

// Drizzle örnekleme
export const db = drizzle(queryClient, { schema });

// Veritabanı tiplerini export edelim
export type DB = typeof db; 