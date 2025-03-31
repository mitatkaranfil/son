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

# Dosya sistemini kontrol et
RUN echo "Listing server directory:" && ls -la server/

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
ENV PORT=8080

# Paket dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm config set loglevel warn \
    && npm install --no-audit --no-fund --prefer-offline \
    && npm install -g tsx \
    && npm cache clean --force

# Server klasörünü kopyala - tüm dosyalar dahil
COPY --from=builder /app/server/*.ts ./server/
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/client-dist ./client-dist

# Kopyalanan dosyaları kontrol et
RUN ls -la server/

# Node debugger için bağlantı noktasını aç
EXPOSE 9229
# Uygulama için bağlantı noktasını aç
EXPOSE 8080

# Uygulamayı TSX ile başlat (TypeScript dosyalarını doğrudan çalıştırma)
CMD ["tsx", "server/index.ts"] 