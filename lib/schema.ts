import {
  mysqlTable,
  int,
  varchar,
  decimal,
  text,
  date,
  tinyint,
  datetime,
} from 'drizzle-orm/mysql-core';

// 映射既有表 `devices`（不会创建表，仅用于类型与查询构建）
export const devices = mysqlTable('devices', {
  id: int('id').autoincrement().primaryKey(),
  code: varchar('code', { length: 128 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  deviceType: varchar('device_type', { length: 32 }).notNull().default('资产'),
  model: varchar('model', { length: 255 }),
  unit: varchar('unit', { length: 32 }).default('台'),
  unitPrice: decimal('unit_price', { precision: 14, scale: 2 }).default('0.00'),
  totalPrice: decimal('total_price', { precision: 16, scale: 2 }).default('0.00'),
  quantity: int('quantity').default(1),
  department: varchar('department', { length: 255 }),
  location: varchar('location', { length: 255 }),
  keeper: varchar('keeper', { length: 255 }),
  storageAt: date('storage_at'),
  usage: text('usage'),
  factoryNumber: varchar('factory_number', { length: 255 }),
  invoiceNumber: varchar('invoice_number', { length: 255 }),
  fundingCode: varchar('funding_code', { length: 255 }),
  funding: varchar('funding', { length: 255 }),
  note: text('note'),
  status: varchar('status', { length: 64 }).default('在用'),
  missing: tinyint('missing').notNull().default(0),
  createdAt: datetime('created_at', { fsp: 3 }).notNull(),
  updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
});

export type DeviceRow = typeof devices.$inferSelect;
export type DeviceInsert = typeof devices.$inferInsert;

