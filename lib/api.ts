import type { DeviceDTO, Paged } from './types';

async function json<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const devicesApi = {
  list(params: Record<string, any>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) sp.set(k, String(v));
    const qs = sp.toString();
    return json<Paged<DeviceDTO>>(`/api/devices${qs ? `?${qs}` : ''}`);
  },
  get(id: number) {
    return json<DeviceDTO>(`/api/devices/${id}`);
  },
  patch(id: number, body: Partial<DeviceDTO>) {
    return json<DeviceDTO>(`/api/devices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  locations(params: Record<string, any>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) sp.set(k, String(v));
    const qs = sp.toString();
    return json<{ items: string[]; total: number; hasNull: boolean }>(`/api/devices/locations${qs ? `?${qs}` : ''}`);
  },
};
