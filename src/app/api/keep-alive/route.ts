import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const noStoreHeaders = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { status: 'error', error: 'Unauthorized' },
      { status: 401, headers: noStoreHeaders }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json(
      { status: 'error', error: 'Supabase configuration is missing' },
      { status: 500, headers: noStoreHeaders }
    );
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data, error } = await supabase
      .from('keepalive')
      .select('id')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { status: 'error', error: 'Keep-alive query failed' },
        { status: 500, headers: noStoreHeaders }
      );
    }

    return NextResponse.json({ status: 'ok' }, { headers: noStoreHeaders });
  } catch {
    return NextResponse.json(
      { status: 'error', error: 'Keep-alive query failed' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
