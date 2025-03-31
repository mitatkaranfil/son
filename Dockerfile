# Build aşaması
FROM node:18

WORKDIR /app

# Log seviyesini arttır
ENV NPM_CONFIG_LOGLEVEL=silly

# Package dosyalarını kopyala
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Tüm bağımlılıkları yükle
RUN npm install

# Tüm proje dosyalarını kopyala
COPY . .

# Node bellek sınırını arttır
ENV NODE_OPTIONS=--max_old_space_size=4096

# Build sırasında detaylı hata bilgisi al
RUN npm run build:client || (echo "Build hatası detayları:" && cat npm-debug.log && exit 1)

# Diğer ayarlar...