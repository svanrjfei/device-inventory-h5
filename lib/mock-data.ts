// Mock data and utilities for frontend-only prototyping.
// Data shape follows DeviceDTO in docs/tech.md (camelCase fields).

export type DeviceDTO = {
  id: number;
  code: string;
  name: string;
  deviceType: string;
  model: string | null;
  unit: string | null;
  unitPrice: string; // keep as string for formatting
  totalPrice: string;
  quantity: number | null;
  department: string | null;
  location: string | null;
  keeper: string | null;
  storageAt: string | null; // yyyy-MM-dd
  usage: string | null;
  factoryNumber: string | null;
  invoiceNumber: string | null;
  fundingCode: string | null;
  funding: string | null;
  note: string | null;
  status: string;
  missing: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

const seed: DeviceDTO[] = [
  {
    id: 761,
    code: '1604761D',
    name: '一级减压阀',
    deviceType: '低值',
    model: 'SS316L',
    unit: '台',
    unitPrice: '890.00',
    totalPrice: '890.00',
    quantity: 1,
    department: '化学与材料工程学院',
    location: '[茶山南校区]南校区11号楼1层D101高温炉室',
    keeper: '彭旭锵',
    storageAt: '2016-12-07',
    usage: '教学',
    factoryNumber: null,
    invoiceNumber: '33646449',
    fundingCode: null,
    funding: null,
    note: null,
    status: '在用',
    missing: true,
    createdAt: '2025-10-28T15:55:04.450Z',
    updatedAt: '2025-10-28T15:55:04.450Z',
  },
  {
    id: 1001,
    code: '1604762X',
    name: '二级减压阀',
    deviceType: '低值',
    model: 'SS316L',
    unit: '台',
    unitPrice: '900.00',
    totalPrice: '900.00',
    quantity: 1,
    department: '化学与材料工程学院',
    location: '[茶山南校区]南校区11号楼1层D102高温炉室',
    keeper: '张三',
    storageAt: '2017-05-03',
    usage: '教学',
    factoryNumber: null,
    invoiceNumber: '33646450',
    fundingCode: null,
    funding: null,
    note: null,
    status: '在用',
    missing: false,
    createdAt: '2025-10-28T15:55:04.450Z',
    updatedAt: '2025-10-28T15:55:04.450Z',
  },
  {
    id: 1002,
    code: 'A-2023-XYZ',
    name: '高温炉',
    deviceType: '资产',
    model: 'HT-9000',
    unit: '台',
    unitPrice: '128000.00',
    totalPrice: '128000.00',
    quantity: 1,
    department: '材料实验中心',
    location: '北校区材料楼201',
    keeper: '李四',
    storageAt: '2020-09-01',
    usage: '科研',
    factoryNumber: 'HT-9000-2020',
    invoiceNumber: 'INV-123456',
    fundingCode: 'FC-2020-09',
    funding: '中央专项',
    note: null,
    status: '在用',
    missing: false,
    createdAt: '2025-10-28T15:55:04.450Z',
    updatedAt: '2025-10-28T15:55:04.450Z',
  },
  {
    id: 1003,
    code: 'B-2020-001',
    name: '真空泵',
    deviceType: '资产',
    model: 'VP-100',
    unit: '台',
    unitPrice: '5600.00',
    totalPrice: '5600.00',
    quantity: 1,
    department: '工程训练中心',
    location: '教学楼B101',
    keeper: '王五',
    storageAt: '2019-01-12',
    usage: '教学',
    factoryNumber: null,
    invoiceNumber: null,
    fundingCode: null,
    funding: null,
    note: '需定期检修',
    status: '闲置',
    missing: false,
    createdAt: '2025-10-28T15:55:04.450Z',
    updatedAt: '2025-10-28T15:55:04.450Z',
  },
];

const LS_KEY = 'mock_devices_v1';

function nowIso() {
  return new Date().toISOString();
}

function load(): DeviceDTO[] {
  if (typeof window === 'undefined') return seed;
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return seed;
  try {
    const arr = JSON.parse(raw) as DeviceDTO[];
    return Array.isArray(arr) && arr.length ? arr : seed;
  } catch {
    return seed;
  }
}

function save(list: DeviceDTO[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

export const mockApi = {
  all(): DeviceDTO[] {
    return load();
  },
  getById(id: number): DeviceDTO | undefined {
    return load().find((d) => d.id === id);
  },
  search(params: { code?: string; search?: string }): DeviceDTO[] {
    const list = load();
    const { code, search } = params;
    if (code) {
      // precise code first
      const eq = list.filter((d) => d.code.toLowerCase() === code.toLowerCase());
      if (eq.length) return eq;
    }
    const q = (search ?? code ?? '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) =>
      [
        d.name,
        d.code,
        d.model ?? '',
        d.location ?? '',
        d.keeper ?? '',
        d.department ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  },
  update(id: number, patch: Partial<DeviceDTO>): DeviceDTO | undefined {
    const list = load();
    const idx = list.findIndex((d) => d.id === id);
    if (idx < 0) return undefined;
    const next = { ...list[idx], ...patch, updatedAt: nowIso() };
    list[idx] = next;
    save(list);
    return next;
  },
  toggleMissing(id: number): DeviceDTO | undefined {
    const item = this.getById(id);
    if (!item) return undefined;
    return this.update(id, { missing: !item.missing });
  },
};

export function formatMoney(v: string | number | null | undefined) {
  if (v == null) return '—';
  const num = typeof v === 'string' ? Number(v) : v;
  if (Number.isNaN(num)) return String(v);
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const da = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

