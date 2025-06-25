FROM node:20-alpine
WORKDIR /app
COPY bun.lock package.json ./
RUN npm install -g bun
RUN bun install
COPY . .