# Build aşaması
FROM node:18

WORKDIR /app

# Increase log level
ENV NPM_CONFIG_LOGLEVEL=verbose

# Copy package files first
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with verbose logging
RUN npm install --verbose

# Copy the rest of the project
COPY . .

# Build the client
RUN npm run build:client

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Expose port
EXPOSE $PORT

# Start the application
CMD ["node", "-r", "dotenv/config", "--import", "tsx", "server/index.ts"]