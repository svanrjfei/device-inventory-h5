import { NextRequest } from 'next/server';
import { distinctLocations } from '@/lib/devices-repo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? undefined;
  const offset = Number(searchParams.get('offset') ?? '0') || 0;
  const limit = Math.min(Number(searchParams.get('limit') ?? '30') || 30, 200);
  const res = await distinctLocations({ search, offset, limit });
  return Response.json(res);
}

