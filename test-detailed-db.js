import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

async function testConnection() {
    try {
        console.log('Veritabanı URL:', databaseUrl);
        
        const connection = neon(databaseUrl);
        console.log('Bağlantı nesnesi oluşturuldu');
        
        const result = await connection`SELECT 1 as test`;
        console.log('Veritabanı bağlantısı başarılı!');
        console.log('Test sonucu:', result[0]);
        
        // Daha detaylı testler
        const dbInfo = await connection`SELECT version() as version, current_database() as database`;
        console.log('Veritabanı bilgisi:', dbInfo[0]);
        
    } catch (error) {
        console.error('Veritabanı bağlantısı başarısız:', error);
        if (error.response) {
            console.error('Hata detayları:', error.response);
        }
    }
}

testConnection();
