import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  // 仅用于生成/对比，不会自动创建表，除非你显式执行 push/migrate
} satisfies Config;

