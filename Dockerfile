# Build aşaması
FROM node:18-alpine AS builder

WORKDIR /app

# Bellek yönetimi - daha fazla bellek ayırıyoruz
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV npm_config_cache=/tmp/npm-cache
ENV npm_config_prefer_offline=true

# Debug için gerekli araçlar
RUN apk add --no-cache bash

# Paket dosyalarını kopyala
COPY package*.json ./
COPY tsconfig.json ./

# Client build için bağımlılıkları yükle
RUN npm config set loglevel warn \
    && npm install --no-audit --no-fund --prefer-offline \
    && npm cache clean --force

# Tüm kaynak kodunu kopyala
COPY . .

# Dosya sistemini kontrol et
RUN echo "Listing server directory:" && ls -la server/
RUN echo "Listing shared directory:" && ls -la shared/

# Client build öncesi ortam değişkenlerini ayarla
ENV NODE_ENV=production
ENV DEBUG=vite:*

# Client uygulamasını derle
RUN npm run build:client || (echo "Client build failed" && exit 1)

# Build sonrası dosyaları kontrol et
RUN echo "Listing root directory:" && ls -la
RUN echo "Listing client-dist directory:" && ls -la client-dist || echo "client-dist directory does not exist"

# Çalışma aşaması
FROM node:18-alpine

WORKDIR /app

# Bellek yönetimi ve ortam değişkenleri
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV NODE_ENV=production
ENV PORT=3000
ENV SUPABASE_URL=https://lfalfdmfehcwnnqxkycj.supabase.co
ENV SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmYWxmZG1mZWhjd25ucXhreWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NDA5NTYsImV4cCI6MjA1OTAxNjk1Nn0.Uh0-GS11EogXWyIf05f4ORk3PqITmEd3cPHMekjcFTs
ENV ADMIN_TELEGRAM_ID=8000260089
ENV SESSION_SECRET=142ba56668d699c70063a0fde382a4f0dde2fed3c5ed3a1e43738c1375941ad1
# TSX için path ayarları
ENV TSX_TSCONFIG_PATH="/app/tsconfig.json"
ENV NODE_PATH=/app

# Paket dosyalarını kopyala
COPY package*.json ./
COPY tsconfig.json ./

# Bağımlılıkları yükle
RUN npm config set loglevel warn \
    && npm install --no-audit --no-fund --prefer-offline \
    && npm install -g tsx \
    && npm cache clean --force

# Kaynak kodunu kopyala - tam bir kopyalama yapmak için ilk aşamadaki tüm dizini kopyalıyoruz
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/client-dist ./client-dist

# Kopyalanan dosyaları kontrol et
RUN echo "Listing root directory:" && ls -la
RUN echo "Listing server directory:" && ls -la server/
RUN echo "Listing shared directory:" && ls -la shared/

# Node debugger için bağlantı noktasını aç
EXPOSE 9229
# Uygulama için bağlantı noktasını aç
EXPOSE 3000

# Uygulamayı TSX ile başlat (TypeScript dosyalarını doğrudan çalıştırma)
CMD ["tsx", "--tsconfig", "/app/tsconfig.json", "server/index.ts"] 