# Build aşaması
FROM node:18-alpine AS builder

WORKDIR /app

# Bellek yönetimi
ENV NODE_OPTIONS="--max-old-space-size=512"

# Debug için gerekli araçlar
RUN apk add --no-cache bash

# Paket dosyalarını kopyala
COPY package*.json ./

# Sadece gerekli bağımlılıkları yükle, bellek kullanımını azaltmak için
RUN npm install --only=production --no-audit --no-fund --prefer-offline --no-optional
RUN npm install --no-save vite esbuild typescript @vitejs/plugin-react

# Kaynak kodunu kopyala
COPY . .

# Client build öncesi ortam değişkenlerini ayarla
ENV NODE_ENV=production
ENV DEBUG=vite:*

# Client uygulamasını derle
RUN npm run build:client || (echo "Client build failed" && exit 1)

# Server uygulamasını derle
RUN npm run build:server

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

# Ortam değişkenlerini ayarla
ENV NODE_ENV=production
ENV PORT=8080

# Portu aç
EXPOSE 8080

# Uygulamayı başlat
CMD ["npm", "start"] 