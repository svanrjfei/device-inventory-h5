import { db } from './db';
import { devices } from './schema';
import { rowToDTO } from './mapping';
import type { DeviceDTO } from './types';
import { and, desc, eq, like, or, sql } from 'drizzle-orm';

export async function getDeviceById(id: number): Promise<DeviceDTO | null> {
  const rows = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
  if (!rows.length) return null;
  return rowToDTO(rows[0]);
}

type ListParams = {
  search?: string;
  code?: string;
  status?: string;
  missing?: 'true' | 'false';
  sort?: string; // updatedAt:desc etc
  offset?: number;
  limit?: number;
};

export async function listDevices(params: ListParams) {
  const {
    search,
    code,
    status,
    missing,
    sort = 'updatedAt:desc',
    offset = 0,
    limit = 20,
  } = params;

  const whereClauses: any[] = [];
  if (code) whereClauses.push(eq(devices.code, code));
  if (status) whereClauses.push(eq(devices.status, status));
  if (missing === 'true' || missing === 'false')
    whereClauses.push(eq(devices.missing, missing === 'true' ? 1 : 0));

  if (search && !code) {
    const q = `%${search}%`;
    whereClauses.push(
      or(
        like(devices.name, q),
        like(devices.model, q),
        like(devices.location, q),
        like(devices.keeper, q),
        like(devices.department, q),
        like(devices.code, q)
      )
    );
  }

  const order = (() => {
    const [field, dir] = sort.split(':');
    const d = dir?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    switch (field) {
      case 'name':
        return d === 'asc' ? devices.name : desc(devices.name);
      case 'status':
        return d === 'asc' ? devices.status : desc(devices.status);
      case 'missing':
        return d === 'asc' ? devices.missing : desc(devices.missing);
      default:
        return d === 'asc' ? devices.updatedAt : desc(devices.updatedAt);
    }
  })();

  const totalRows = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(devices)
    .where(whereClauses.length ? and(...whereClauses) : undefined);

  const rows = await db
    .select()
    .from(devices)
    .where(whereClauses.length ? and(...whereClauses) : undefined)
    .orderBy(order)
    .limit(limit)
    .offset(offset);

  return {
    items: rows.map(rowToDTO),
    total: totalRows[0]?.count ?? 0,
  };
}

export async function patchDevice(id: number, body: Partial<DeviceDTO>): Promise<DeviceDTO | null> {
  const patch: any = {};
  if (typeof body.missing === 'boolean') patch.missing = body.missing ? 1 : 0;
  if (body.name !== undefined) patch.name = body.name;
  if (body.model !== undefined) patch.model = body.model;
  if (body.status !== undefined) patch.status = body.status;
  if (body.unit !== undefined) patch.unit = body.unit;
  if (body.unitPrice !== undefined) patch.unit_price = body.unitPrice as any;
  if (body.totalPrice !== undefined) patch.total_price = body.totalPrice as any;
  if (body.quantity !== undefined) patch.quantity = body.quantity as any;
  if (body.department !== undefined) patch.department = body.department;
  if (body.location !== undefined) patch.location = body.location;
  if (body.keeper !== undefined) patch.keeper = body.keeper;
  if (body.storageAt !== undefined) patch.storage_at = body.storageAt as any;
  if (body.usage !== undefined) patch.usage = body.usage;
  if (body.factoryNumber !== undefined) patch.factory_number = body.factoryNumber;
  if (body.invoiceNumber !== undefined) patch.invoice_number = body.invoiceNumber;
  if (body.fundingCode !== undefined) patch.funding_code = body.fundingCode;
  if (body.funding !== undefined) patch.funding = body.funding;
  if (body.note !== undefined) patch.note = body.note;

  if (Object.keys(patch).length === 0) return await getDeviceById(id);

  await db.update(devices).set(patch).where(eq(devices.id, id));
  return await getDeviceById(id);
}

