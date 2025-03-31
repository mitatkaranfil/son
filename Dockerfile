FROM node:18-alpine

WORKDIR /app

# package.json ve package-lock.json dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install --legacy-peer-deps

# Uygulama kodunu kopyala
COPY . .

# Uygulamayı build et
RUN npm run build

# Portu aç
EXPOSE 8080

# Uygulamayı başlat
CMD ["npm", "start"] 