import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(24),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(10),
  BACKEND_PORT: z.coerce.number().default(3001),
  FRONTEND_PUBLIC_URL: z.string().url().optional(),
  YOOKASSA_SHOP_ID: z.string().optional(),
  YOOKASSA_SECRET_KEY: z.string().optional(),
  YOOKASSA_RETURN_URL: z.string().url().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional()
});

export function validateConfig(config: Record<string, unknown>) {
  return schema.passthrough().parse(config);
}
