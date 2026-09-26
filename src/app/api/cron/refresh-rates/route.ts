import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchLiveRates } from '@/lib/liveRates';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET 未設定' }, { status: 500 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let live;
  try {
    live = await fetchLiveRates();
  } catch (e) {
    return NextResponse.json({ error: '無法取得匯率', detail: String(e) }, { status: 502 });
  }

  const { data: trips, error } = await supabase.from('trips').select('id, end_date, exchange_rates');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const todayHK = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' });
  let updated = 0;
  let skippedFinished = 0;
  let skippedManual = 0;
  let failed = 0;

  for (const trip of trips ?? []) {
    const current = (trip.exchange_rates ?? {}) as Record<string, number>;
    if (trip.end_date < todayHK) {
      skippedFinished++;
      continue;
    }
    if (current._auto === 0) {
      skippedManual++;
      continue;
    }
    const { error: upErr } = await supabase
      .from('trips')
      .update({ exchange_rates: { ...current, ...live.rates, _updatedAt: live.asOf } })
      .eq('id', trip.id);
    if (upErr) failed++;
    else updated++;
  }

  return NextResponse.json({ updated, skippedFinished, skippedManual, failed, asOf: live.asOf, source: live.source });
}
