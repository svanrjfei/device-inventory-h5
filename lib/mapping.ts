import type { DeviceRow } from './schema';
import type { DeviceDTO } from './types';

function toISO(v: any): string {
  if (v == null) return v;
  if (v instanceof Date) return v.toISOString();
  // mysql2 may return string
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.toISOString();
  return String(v);
}

function toDateOnly(v: any): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // assume yyyy-mm-dd or string
  const s = String(v).slice(0, 10);
  return s || null;
}

export function rowToDTO(row: DeviceRow): DeviceDTO {
  return {
    id: row.id!,
    code: row.code!,
    name: row.name!,
    deviceType: row.deviceType!,
    model: row.model ?? null,
    unit: row.unit ?? null,
    unitPrice: row.unitPrice?.toString?.() ?? String(row.unitPrice ?? ''),
    totalPrice: row.totalPrice?.toString?.() ?? String(row.totalPrice ?? ''),
    quantity: row.quantity ?? null,
    department: row.department ?? null,
    location: row.location ?? null,
    keeper: row.keeper ?? null,
    storageAt: toDateOnly(row.storageAt),
    usage: row.usage ?? null,
    factoryNumber: row.factoryNumber ?? null,
    invoiceNumber: row.invoiceNumber ?? null,
    fundingCode: row.fundingCode ?? null,
    funding: row.funding ?? null,
    note: row.note ?? null,
    status: row.status ?? '在用',
    missing: Boolean((row as any).missing),
    createdAt: toISO(row.createdAt),
    updatedAt: toISO(row.updatedAt),
  };
}
