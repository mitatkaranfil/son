# Build aşaması
FROM node:18-alpine AS builder

WORKDIR /app

# Bellek yönetimi
ENV NODE_OPTIONS="--max-old-space-size=512"

# Debug için gerekli araçlar
RUN apk add --no-cache bash

# Paket dosyalarını kopyala
COPY package*.json ./

# Tüm bağımlılıkları yükle (dev dahil), build için gerekli
RUN npm ci --no-audit --no-fund --prefer-offline

# Kaynak kodunu kopyala
COPY . .

# Client build öncesi ortam değişkenlerini ayarla
ENV NODE_ENV=production
ENV DEBUG=vite:*

# Client uygulamasını derle
RUN npm run build:client || (echo "Client build failed" && exit 1)

# Server uygulamasını derle
RUN npm run build:server || (echo "Server build failed" && exit 1)

# Çalışma aşaması
FROM node:18-alpine

WORKDIR /app

# Bellek yönetimi
ENV NODE_OPTIONS="--max-old-space-size=512"

# Paket dosyalarını kopyala
COPY package*.json ./

# Sadece üretim bağımlılıklarını yükle
RUN npm install --only=production --no-audit --no-fund --prefer-offline

# Derleme aşamasından gerekli dosyaları kopyala
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

# Ortam değişkenlerini ayarla
ENV NODE_ENV=production
ENV PORT=8080

# Portu aç
EXPOSE 8080

# Uygulamayı başlat
CMD ["npm", "start"] 