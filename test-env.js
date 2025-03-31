import * as dotenv from 'dotenv';

dotenv.config();

console.log('Çevre Değişkenleri Testi');
console.log('------------------------');

// DATABASE_URL kontrolü
console.log('\nDATABASE_URL:');
console.log(process.env.DATABASE_URL);

// URL parçalama
try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('\nURL Parçaları:');
    console.log('Protocol:', url.protocol);
    console.log('Hostname:', url.hostname);
    console.log('Port:', url.port);
    console.log('Pathname:', url.pathname);
    console.log('Username:', url.username);
    console.log('Password:', url.password);
} catch (error) {
    console.error('\nURL analizi hatası:', error);
}

// Diğer önemli değişkenler
console.log('\nDiğer Değişkenler:');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);
console.log('SESSION_SECRET:', process.env.SESSION_SECRET);
