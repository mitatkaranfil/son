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

# Client build için bağımlılıkları yükle
RUN npm config set loglevel warn \
    && npm install --no-audit --no-fund --prefer-offline \
    && npm cache clean --force

# Tüm kaynak kodunu kopyala
COPY . .

# Client build öncesi ortam değişkenlerini ayarla
ENV NODE_ENV=production
ENV DEBUG=vite:*

# Client uygulamasını derle
RUN npm run build:client || (echo "Client build failed" && exit 1)

# Çalışma aşaması
FROM node:18-alpine

WORKDIR /app

# Bellek yönetimi ve ortam değişkenleri
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV NODE_ENV=production
ENV PORT=8080

# Paket dosyalarını kopyala
COPY package*.json ./

# Tüm bağımlılıkları yükle (dev dahil) - TS Node için gerekli
RUN npm config set loglevel warn \
    && npm install --no-audit --no-fund --prefer-offline \
    && npm install -g tsx \
    && npm cache clean --force

# Server dosyalarını kopyala
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

# Node debugger için bağlantı noktasını aç
EXPOSE 9229
# Uygulama için bağlantı noktasını aç
EXPOSE 8080

# Uygulamayı TSX ile başlat (TypeScript doğrudan çalıştırma)
CMD ["tsx", "server/index.ts"] 