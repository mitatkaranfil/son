import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
    try {
        await prisma.$connect();
        console.log('Veritabanı bağlantısı başarılı!');
        const result = await prisma.$queryRaw`SELECT NOW()`;
        console.log('Veritabanı çalışır durumda:', result[0]);
    } catch (error) {
        console.error('Veritabanı bağlantısı başarısız:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
