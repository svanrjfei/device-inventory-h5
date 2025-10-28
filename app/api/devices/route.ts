import { NextRequest } from 'next/server';
import { listDevices } from '@/lib/devices-repo';

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
    sort: searchParams.get('sort') ?? undefined,
    offset: Number(searchParams.get('offset') ?? '0') || 0,
    limit: Math.min(Number(searchParams.get('limit') ?? '20') || 20, 100),
  });
  return Response.json(res);
}

