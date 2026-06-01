# LumaVPN

Production-ready монорепозиторий сервиса продажи VPN-доступа с YooKassa, Telegram-ботом и автоматической выдачей конфигураций.

## Структура

```text
apps/backend       NestJS API, Prisma, YooKassa, VPN provisioning, admin API
apps/frontend      Next.js 15 сайт, кабинет, админка
apps/telegram-bot  Telegram Bot API клиент
packages/shared    общие типы, тарифы, Zod-схемы
infrastructure     Docker Compose, nginx, deploy scripts
```

## Локальный запуск

```bash
cp .env.example .env
npm install
npm run prisma:generate -w @lumavpn/backend
npm run prisma:dev -w @lumavpn/backend
npm run seed -w @lumavpn/backend
npm run dev:backend
npm run dev:frontend
npm run dev:bot
```

## Ubuntu 24.04 VPS

```bash
apt update
apt install -y ca-certificates curl git nginx certbot
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER
```

```bash
git clone <repo-url> /opt/lumavpn
cd /opt/lumavpn
cp .env.example .env
nano .env
docker compose -f infrastructure/docker-compose.yml up -d --build
```

## Домен и SSL

```bash
certbot certonly --standalone -d vpn.example.com
```

После выпуска сертификата укажите `DOMAIN`, `FRONTEND_PUBLIC_URL`, `BACKEND_PUBLIC_URL`, `NEXT_PUBLIC_API_URL` в `.env` и перезапустите compose.

## YooKassa

Webhook URL:

```text
https://vpn.example.com/api/webhooks/yookassa
```

События: `payment.succeeded`, `payment.canceled`.

## Telegram Bot

```text
TELEGRAM_BOT_TOKEN=...
TELEGRAM_SUPPORT_URL=https://t.me/...
```

Бот синхронизирует пользователя с backend, создает платежи и отправляет активные конфиги.

## Xray Reality

Backend ожидает API-адаптер Xray по `XRAY_API_HOST:XRAY_API_PORT`. Методы-заготовки:

```text
POST /vless/users
DELETE /vless/users/:uuid
```

В production подключите xray-controller или gRPC-адаптер и заполните `XRAY_REALITY_PUBLIC_KEY`, `XRAY_REALITY_SHORT_ID`.

## AmneziaWG

На хосте должен быть настроен интерфейс `AMNEZIA_INTERFACE`. Контейнеру backend нужен доступ к `wg`, если peer-операции выполняются из контейнера.

## MTProto Proxy

Укажите:

```text
MTPROTO_HOST=vpn.example.com
MTPROTO_PORT=443
MTPROTO_SECRET=<32 hex>
```

## Админка

Адрес:

```text
https://vpn.example.com/admin
```

Возможности: статистика, последние подписки, ручная выдача подписки пользователю по `telegramId` или `userId`.

## Backup PostgreSQL

```bash
chmod +x infrastructure/deployment/backup-postgres.sh
POSTGRES_USER=lumavpn POSTGRES_DB=lumavpn ./infrastructure/deployment/backup-postgres.sh
```
