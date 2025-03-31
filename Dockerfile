# Build aşaması
FROM node:18-alpine AS builder

WORKDIR /app

# Bellek yönetimi - daha fazla bellek ayırıyoruz
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV npm_config_cache=/tmp/npm-cache
ENV npm_config_prefer_offline=true

# Paket dosyalarını kopyala
COPY package*.json ./
COPY tsconfig.json ./

# Bağımlılıkları yükle
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
ENV PORT=8080

# Paket dosyalarını kopyala
COPY package*.json ./
COPY tsconfig.json ./

# Sadece üretim bağımlılıklarını yükle
RUN npm config set loglevel warn \
    && npm install --no-audit --no-fund --prefer-offline --only=production \
    && npm cache clean --force

# Server ve client dosyalarını kopyala
COPY server/ ./server/
COPY client-dist/ ./client-dist/
COPY .env ./

# Expose port
EXPOSE $PORT

# Start the application
CMD ["node", "-r", "dotenv/config", "--import", "tsx", "server/index.ts"]