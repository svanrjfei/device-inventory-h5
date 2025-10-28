import { NextRequest } from 'next/server';
import { getDeviceById, patchDevice } from '@/lib/devices-repo';

export const dynamic = 'force-dynamic';

// In Next 16, params can be a Promise in dynamic APIs.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: 'BadRequest', message: 'invalid id' }), { status: 400 });
  }
  const dev = await getDeviceById(id);
  if (!dev) return new Response(JSON.stringify({ error: 'NotFound' }), { status: 404 });
  return Response.json(dev);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: 'BadRequest', message: 'invalid id' }), { status: 400 });
  }
  const body = await req.json();
  const updated = await patchDevice(id, body);
  if (!updated) return new Response(JSON.stringify({ error: 'NotFound' }), { status: 404 });
  return Response.json(updated);
}
