FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/telegram-bot/package.json apps/telegram-bot/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build -w @lumavpn/shared && npm run build -w @lumavpn/telegram-bot

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/telegram-bot/dist ./apps/telegram-bot/dist
COPY --from=builder /app/apps/telegram-bot/package.json ./apps/telegram-bot/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
CMD ["node", "apps/telegram-bot/dist/main.js"]
