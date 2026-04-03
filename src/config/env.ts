import { z } from 'zod';
import dotenv from 'dotenv';


dotenv.config();

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    PORT: z.string().default('3000'),
    NODE_ENV: z.enum(['development','production','test']).default('development'),

    ACCESS_TOKEN_SECRET: z.string().min(32),
    REFRESH_TOKEN_SECRET: z.string().min(32),
    ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRY_DAYS: z.string().default('7'),

    BCRYPT_SALT_ROUNDS: z.string().default('12'),
    RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
    RATE_LIMIT_MAX: z.string().default('100'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('[Config] Missing or invalid environment variables:');
    console.error(parsed.error.format());
    process.exit(1);
}

export const env = {
    ...parsed.data,
    PORT: Number(parsed.data.PORT),
    BCRYPT_SALT_ROUNDS: Number(parsed.data.BCRYPT_SALT_ROUNDS),
    REFRESH_TOKEN_EXPIRY_DAYS: Number(parsed.data.REFRESH_TOKEN_EXPIRY_DAYS),
    RATE_LIMIT_WINDOW_MS: Number(parsed.data.RATE_LIMIT_WINDOW_MS),
    RATE_LIMIT_MAX: Number(parsed.data.RATE_LIMIT_MAX),
};