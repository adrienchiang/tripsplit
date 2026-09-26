import { NextResponse } from 'next/server';
import { fetchLiveRates } from '@/lib/liveRates';

export async function GET() {
  try {
    const live = await fetchLiveRates();
    return NextResponse.json(live, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ error: '暫時無法取得最新匯率' }, { status: 502 });
  }
}
