import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('5010'),
  FRONTEND_URL: z.string().url().default('http://localhost:3025'),
  CORS_ALLOWED_ORIGINS: z.string().optional().default(''),

  // SQL Server
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z.string().transform(Number).default('1433'),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_ENCRYPT: z.string().transform((v) => v === 'true').default('true'),
  DB_TRUST_CERT: z.string().transform((v) => v === 'true').default('true'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional().default(''),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  // IVR
  IVR_API_BASE_URL: z.string().optional().default('https://api.ivrsolutions.in'),
  IVR_API_TOKEN: z.string().optional(),
  IVR_SUBDOMAIN: z.string().optional(),
  IVR_DID_NUMBER: z.string().optional().default('01140005000'),

  // Email
  SMTP_HOST: z.string().optional().default('smtp.gmail.com'),
  SMTP_PORT: z.string().transform(Number).default('587'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default('noreply@yourcrm.com'),

  // App
  TIMEZONE: z.string().default('Asia/Kolkata'),
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
});

const parseResult = environmentSchema.safeParse(process.env);

let parsedEnv: z.infer<typeof environmentSchema>;

if (!parseResult.success) {
  if (process.env.NODE_ENV === 'test') {
    // In test environment, populate safe defaults to allow unit tests to run without active DB
    parsedEnv = environmentSchema.parse({
      NODE_ENV: 'test',
      PORT: '5010',
      FRONTEND_URL: 'http://localhost:3025',
      DB_HOST: 'localhost',
      DB_PORT: '1433',
      DB_NAME: 'sales_crm_test',
      DB_USER: 'sa',
      DB_PASSWORD: 'TestPassword123!',
      DB_ENCRYPT: 'true',
      DB_TRUST_CERT: 'true',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      JWT_ACCESS_SECRET: 'test-jwt-access-secret-minimum-32-chars-long',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-minimum-32-chars-long',
      TIMEZONE: 'Asia/Kolkata',
      BCRYPT_ROUNDS: '4', // fast rounds for tests
    });
  } else {
    console.error('❌ Invalid environment variables:');
    parseResult.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
} else {
  parsedEnv = parseResult.data;
}

export const env = parsedEnv;
export type Environment = typeof env;
