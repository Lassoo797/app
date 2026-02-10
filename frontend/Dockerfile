FROM node:22-bookworm AS base

WORKDIR /app/frontend

RUN apt-get update && apt-get install -y git

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3010

CMD ["npm", "run", "dev"]