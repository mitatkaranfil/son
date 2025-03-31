import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

async function testConnection() {
    try {
        console.log('Veritabanı URL:', databaseUrl);
        
        // Test 1: Temel bağlantı testi
        const connection = neon(databaseUrl);
        console.log('Bağlantı nesnesi oluşturuldu');
        
        // Test 2: Simple sorgu
        const result = await connection`SELECT 1 as test`;
        console.log('Veritabanı bağlantısı başarılı!');
        console.log('Test sonucu:', result[0]);
        
        // Test 3: Veritabanı bilgisi
        const dbInfo = await connection`SELECT version() as version, current_database() as database`;
        console.log('Veritabanı bilgisi:', dbInfo[0]);
        
        // Test 4: Tablo kontrolü
        const tables = await connection`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `;
        console.log('Veritabanı tabloları:', tables);
        
    } catch (error) {
        console.error('Hata:', error);
        console.error('Hata detayları:', {
            message: error.message,
            stack: error.stack,
            response: error.response,
            code: error.code,
            name: error.name
        });
    }
}

testConnection();
