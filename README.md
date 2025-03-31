# Cosmo Web App

Telegram entegrasyonlu bir madencilik/görev tamamlama platformu. Kullanıcılar görevleri tamamlayarak puan kazanabilir ve bu puanları kullanarak çeşitli boostlar satın alabilirler.

## Özellikler

- 🔒 Telegram hesaplarıyla giriş yapma
- 📊 Dashboard ile puan ve madencilik hızını izleme
- ✅ Günlük, haftalık ve özel görevler
- 🚀 Boost mağazası
- 👤 Profil sayfası
- 👫 Referans sistemi

## Teknolojiler

- **Frontend**: React, TypeScript, TailwindCSS, Shadcn UI
- **Backend**: Express.js, PostgreSQL (Drizzle ORM)
- **Entegrasyonlar**: Firebase, Telegram WebApp API

## Kurulum

### Gereksinimler

- Node.js
- PostgreSQL veritabanı (Neon.tech önerilir)
- Firebase hesabı
- Telegram bot

### Yerel Kurulum

1. Repoyu klonlayın:
   ```bash
   git clone https://github.com/mitatkaranfil/son.git
   cd son
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. `.env` dosyasını oluşturun ve gerekli değişkenleri ayarlayın:
   ```
   DATABASE_URL=postgres://user:password@hostname/database
   FIREBASE_API_KEY=your_api_key
   FIREBASE_AUTH_DOMAIN=your_auth_domain
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_storage_bucket
   FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   FIREBASE_APP_ID=your_app_id
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   SESSION_SECRET=your_session_secret
   ```

4. Veritabanı şemasını oluşturun:
   ```bash
   npm run db:push
   ```

5. Uygulamayı başlatın:
   ```bash
   npm run dev
   ```

### Deploy

Railway.app kullanarak deploy etmek için:

1. GitHub reponuzu Railway'e bağlayın
2. Gerekli çevre değişkenlerini ekleyin
3. Domain oluşturun
4. Telegram botunuzu domain ile yapılandırın

## Lisans

MIT 