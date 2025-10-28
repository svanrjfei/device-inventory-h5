import { NextRequest } from 'next/server';
import { getDeviceById, patchDevice } from '@/lib/devices-repo';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const dev = await getDeviceById(id);
  if (!dev) return new Response(JSON.stringify({ error: 'NotFound' }), { status: 404 });
  return Response.json(dev);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await req.json();
  const updated = await patchDevice(id, body);
  if (!updated) return new Response(JSON.stringify({ error: 'NotFound' }), { status: 404 });
  return Response.json(updated);
}

