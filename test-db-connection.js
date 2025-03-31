import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

async function testConnection() {
    try {
        const connection = neon(databaseUrl);
        const result = await connection`SELECT 1 as test`;
        console.log('Veritabanı bağlantısı başarılı!');
        console.log('Test sonucu:', result[0]);
    } catch (error) {
        console.error('Veritabanı bağlantısı başarısız:', error);
    }
}

testConnection();
