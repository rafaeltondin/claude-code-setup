import { z } from 'zod';

const envSchema = z.object({
  APP_SECRET: z.string().min(16, 'APP_SECRET deve ter no minimo 16 caracteres'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('file:../data/crm.db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  ALLOWED_ORIGINS: z.string().optional().default('http://localhost:5173,http://localhost:3000,http://localhost:5000,http://localhost:3847'),
  EVOLUTION_WEBHOOK_SECRET: z.string().optional(),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Variaveis de ambiente invalidas:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
