import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/better-auth/auth';
import { getHyperliquidCandles, HYPERLIQUID_INTERVALS, isHyperliquidSymbol, type HyperliquidInterval } from '@/lib/hyperliquid';
import { isRateLimited } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const symbol = (req.nextUrl.searchParams.get('symbol') ?? '').toUpperCase();
    const interval = req.nextUrl.searchParams.get('interval') ?? '5m';
    if (!isHyperliquidSymbol(symbol) || !(interval in HYPERLIQUID_INTERVALS)) {
        return NextResponse.json({ error: 'Invalid symbol or interval' }, { status: 400 });
    }
    if (await isRateLimited(`hyperliquid:candles:${session.user.id}`, 30, 60)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    try {
        const candles = await getHyperliquidCandles(symbol, interval as HyperliquidInterval);
        return NextResponse.json(candles, { headers: { 'Cache-Control': 'private, max-age=30' } });
    } catch {
        return NextResponse.json({ error: 'Hyperliquid data unavailable' }, { status: 502 });
    }
}
