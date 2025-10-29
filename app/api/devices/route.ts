import { NextRequest } from 'next/server';
import { listDevices, createDevice } from '@/lib/devices-repo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const res = await listDevices({
    search: searchParams.get('search') ?? undefined,
    code: searchParams.get('code') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    missing: ((): 'true' | 'false' | undefined => {
      const v = searchParams.get('missing');
      if (v === 'true' || v === 'false') return v;
      return undefined;
    })(),
    location: searchParams.get('location') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    offset: Number(searchParams.get('offset') ?? '0') || 0,
    limit: Math.min(Number(searchParams.get('limit') ?? '20') || 20, 100),
  });
  return Response.json(res);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await createDevice(body);
    return Response.json(created, { status: 201 });
  } catch (e: any) {
    const msg = e?.message || 'CreateFailed';
    return new Response(JSON.stringify({ error: 'BadRequest', message: msg }), { status: 400 });
  }
}
