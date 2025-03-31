import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.query('SELECT NOW()', (err, res) => {
    console.log('Veritabanı bağlantısı testi:', err ? 'Başarısız' : 'Başarılı');
    if (err) {
        console.error('Hata:', err);
    } else {
        console.log('Veritabanı çalışır durumda:', res.rows[0]);
    }
    pool.end();
});
