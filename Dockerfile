# Build aşaması
FROM node:18-alpine AS builder

WORKDIR /app

# Debug için gerekli araçlar
RUN apk add --no-cache bash

# Paket dosyalarını kopyala ve bağımlılıkları yükle
COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit

# Kaynak kodunu kopyala
COPY . .

# Client uygulamasını derle
RUN npm run build:client

# Server uygulamasını derle
RUN npm run build:server

# Çalışma aşaması
FROM node:18-alpine

WORKDIR /app

# Paket dosyalarını kopyala
COPY package*.json ./

# Sadece production bağımlılıkları yükle
RUN npm install --only=production --legacy-peer-deps --no-audit

# Derleme aşamasından gerekli dosyaları kopyala
COPY --from=builder /app/dist ./dist

# Ortam değişkenlerini ayarla
ENV NODE_ENV=production
ENV PORT=8080

# Portu aç
EXPOSE 8080

# Uygulamayı başlat
CMD ["npm", "start"] 