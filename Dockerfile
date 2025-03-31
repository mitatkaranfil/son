# Build aşaması
FROM node:18

WORKDIR /app

# Verbose logging
ENV NPM_CONFIG_LOGLEVEL=verbose

# Package dosyalarını kopyala
COPY package*.json ./
COPY tsconfig*.json ./

# Tüm bağımlılıkları yükle (dev bağımlılıkları da dahil)
RUN npm install --verbose

# Proje dosyalarını kopyala
COPY . .

# Client build için gerekli ortam değişkenlerini ayarla
# Örneğin, eğer build sırasında .env dosyasına ihtiyaç varsa
# COPY .env ./ 

# Client'ı build et
RUN npm run build:client

# Diğer ayarlar...