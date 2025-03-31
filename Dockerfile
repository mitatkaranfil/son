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

# Dependencies kurulumunu optimize et
RUN npm config set loglevel warn \
    && npm ci --no-audit --no-fund --prefer-offline --production=false \
    && npm cache clean --force

# Kaynak kodunu kopyala
COPY . .

# Client build öncesi ortam değişkenlerini ayarla
ENV NODE_ENV=production
ENV DEBUG=vite:*

# Client uygulamasını derle
RUN npm run build:client || (echo "Client build failed" && exit 1)

# Server uygulamasını derle
RUN npm run build:server || (echo "Server build failed" && exit 1)

# Çalışma aşaması - Daha küçük bir base image kullan
FROM node:18-alpine AS runtime

WORKDIR /app

# Bellek yönetimi
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV NODE_ENV=production
ENV PORT=8080

# Paket dosyalarını kopyala
COPY package*.json ./

# Sadece üretim bağımlılıklarını yükle - bellek kullanımını optimize et
RUN npm config set loglevel warn \
    && npm install --only=production --no-audit --no-fund --prefer-offline \
    && npm cache clean --force

# Derleme aşamasından gerekli dosyaları kopyala
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

# Portu aç
EXPOSE 8080

# Uygulamayı başlat
CMD ["node", "dist/index.js"] 