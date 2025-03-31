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

# Dependencies kurulumunu optimize et - npm ci yerine npm install kullan
# npm ci, package-lock.json gerektirdiği ve senkronize olması gerektiği için hata veriyor
RUN npm config set loglevel warn \
    && npm install --no-audit --no-fund --prefer-offline \
    && npm cache clean --force

# Tüm kaynak kodunu kopyala
COPY . .

# Typescript ve esbuild ile ilgili sorunlara karşı build öncesi önlem
RUN npm rebuild esbuild --update-binary

# Client build öncesi ortam değişkenlerini ayarla
ENV NODE_ENV=production
ENV DEBUG=vite:*

# Client uygulamasını derle
RUN npm run build:client || (echo "Client build failed" && exit 1)

# Server klasörünü dist'e kopyala - build yerine doğrudan tüm dosyaları kopyalayalım
RUN mkdir -p dist && cp -r server/* dist/

# Server uygulamasını derle - alternatif yaklaşım
RUN cd dist && node --trace-warnings ../node_modules/esbuild/bin/esbuild index.ts --platform=node --bundle --format=esm --outfile=index.js || (echo "Manual Server build failed" && exit 1)

# Çalışma aşaması - Daha küçük bir base image kullan
FROM node:18-alpine AS runtime

WORKDIR /app

# Bellek yönetimi
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV NODE_ENV=production
ENV PORT=8080

# Paket dosyalarını kopyala
COPY package*.json ./

# Sadece üretim bağımlılıklarını yükle - install komutunda --omit=dev kullan
RUN npm config set loglevel warn \
    && npm install --omit=dev --no-audit --no-fund --prefer-offline \
    && npm cache clean --force

# Derleme aşamasından gerekli dosyaları kopyala
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

# Node debugger için bağlantı noktasını aç
EXPOSE 9229
# Uygulama için bağlantı noktasını aç
EXPOSE 8080

# Uygulamayı başlat
CMD ["node", "dist/index.js"] 