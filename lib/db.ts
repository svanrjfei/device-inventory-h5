import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// 复用全局连接池，避免开发模式下热重载造成的连接泄露
const globalForDb = globalThis as unknown as {
  __mysqlPool?: mysql.Pool;
  __drizzleDb?: ReturnType<typeof drizzle>;
};

let poolImpl = globalForDb.__mysqlPool;
if (!poolImpl) {
  if (process.env.MYSQL_SSL === '1') {
    // 需要强制启用 TLS 的环境（如部分云厂商）
    const u = new URL(connectionString);
    poolImpl = mysql.createPool({
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: decodeURIComponent(u.pathname.replace(/^\//, '')),
      ssl: { rejectUnauthorized: false },
    });
  } else {
    // 默认按连接串创建
    poolImpl = mysql.createPool(connectionString);
  }
}

export const pool = poolImpl;
export const db = globalForDb.__drizzleDb ?? drizzle(pool);

if (!globalForDb.__mysqlPool) globalForDb.__mysqlPool = pool;
if (!globalForDb.__drizzleDb) globalForDb.__drizzleDb = db;

export type DbType = typeof db;
