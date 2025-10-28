import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

type GlobalDb = {
  __mysqlPool?: mysql.Pool;
  __drizzleDb?: any;
};

const globalForDb = globalThis as unknown as GlobalDb;

function makePool(url: string) {
  const u = new URL(url);
  // SSL decision order:
  // 1) Respect explicit MYSQL_SSL env ("1/true" to enable, "0/false" to disable)
  // 2) Respect explicit ssl URL param (ssl=true/false)
  // 3) Default: no SSL to avoid HANDSHAKE_NO_SSL_SUPPORT on servers without TLS
  const envSsl = (process.env.MYSQL_SSL || '').toLowerCase();
  let shouldSSL: boolean;
  if (envSsl === '1' || envSsl === 'true') shouldSSL = true;
  else if (envSsl === '0' || envSsl === 'false') shouldSSL = false;
  else {
    const sslParam = (u.searchParams.get('ssl') || '').toLowerCase();
    if (sslParam === '1' || sslParam === 'true') shouldSSL = true;
    else if (sslParam === '0' || sslParam === 'false') shouldSSL = false;
    else shouldSSL = false;
  }

  const options: mysql.PoolOptions = {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, '')),
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 10),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 10_000,
    charset: 'utf8mb4_general_ci',
    // @ts-ignore supported by mysql2
    maxIdle: 10,
    // @ts-ignore supported by mysql2
    idleTimeout: 60_000,
  } as any;

  if (shouldSSL) {
    (options as any).ssl = { rejectUnauthorized: false };
  }

  return mysql.createPool(options);
}

export const pool: mysql.Pool = globalForDb.__mysqlPool ?? makePool(connectionString);
export const db: any = globalForDb.__drizzleDb ?? drizzle(pool as any);

if (!globalForDb.__mysqlPool) globalForDb.__mysqlPool = pool;
if (!globalForDb.__drizzleDb) globalForDb.__drizzleDb = db;

export type DbType = typeof db;
