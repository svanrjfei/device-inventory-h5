export interface DeviceDTO {
  id: number;
  code: string;
  name: string;
  deviceType: string;
  model: string | null;
  unit: string | null;
  unitPrice: string;
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
}

export interface Paged<T> {
  items: T[];
  total: number;
}

