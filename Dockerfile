FROM node:20-slim AS builder

WORKDIR /app

# Install openssl for Prisma engine build
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

# Install openssl at runtime for Prisma client
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
COPY .env.production ./

RUN mkdir -p uploads logs
RUN chown -R nodeuser:nodejs /app

USER nodeuser

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
