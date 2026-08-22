FROM node:20-slim AS base

# Dependências do Chromium (Puppeteer) para geração de PDF
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 4000
# migrate deploy + seed rodam a cada start, mas ambos são idempotentes
# (seed usa upsert; migrate deploy só aplica migrations pendentes).
CMD ["sh", "-c", "npx prisma migrate deploy && npm run prisma:seed && npm run start"]
