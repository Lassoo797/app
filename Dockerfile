FROM node:22-alpine AS base

WORKDIR /app

# Nainštalujeme Git (podľa tvojho vzoru)
RUN apk update && apk add git

# Skopírujeme package.json
COPY package*.json ./

# Nainštalujeme závislosti
RUN npm install --legacy-peer-deps

# Skopírujeme src priečinok
COPY src/ ./src/

# Skopírujeme ostatné súbory do rootu /app
COPY index.html .
COPY vite.config.ts .
COPY tsconfig.json .

EXPOSE 3010

CMD ["npm", "run", "dev"]