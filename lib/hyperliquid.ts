// Read-only market data from Hyperliquid's public Info API. HL: identifies the
// native perp DEX; XYZ: identifies trade[XYZ]'s HIP-3 perp DEX. These are
// contracts, not the underlying shares or spot coins.
const INFO_URL = 'https://api.hyperliquid.xyz/info';
const SYMBOL = /^(HL|XYZ):[A-Z0-9][A-Z0-9._-]{0,19}$/;

export type HyperliquidMarket = {
    symbol: string;
    coin: string;
    dex: 'hl' | 'xyz';
    price: number;
    previousPrice: number;
    change: number;
    changePercent: number;
    funding: number;
    openInterest: number;
    volume24h: number;
    maxLeverage: number;
};

export type HyperliquidCandle = { time: number; open: number; high: number; low: number; close: number; volume: number };

type Asset = { name: string; maxLeverage?: number; isDelisted?: boolean };
type Context = { markPx?: string; midPx?: string; prevDayPx?: string; funding?: string; openInterest?: string; dayNtlVlm?: string };
type RawCandle = { t: number; o: string; h: string; l: string; c: string; v: string };

const number = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

export const isHyperliquidSymbol = (symbol: string) => SYMBOL.test(symbol.toUpperCase());

export function hyperliquidCoin(symbol: string): string | null {
    const upper = symbol.toUpperCase();
    if (!SYMBOL.test(upper)) return null;
    const [, dex, coin] = upper.match(/^(HL|XYZ):(.+)$/)!;
    return dex === 'XYZ' ? `xyz:${coin}` : coin;
}

export function parseHyperliquidMarkets(data: unknown, dex: 'hl' | 'xyz'): HyperliquidMarket[] {
    if (!Array.isArray(data) || !Array.isArray(data[0]?.universe) || !Array.isArray(data[1])) return [];
    return (data[0].universe as Asset[]).flatMap((asset, i) => {
        const ctx = data[1][i] as Context | undefined;
        const coin = asset?.name?.replace(/^xyz:/i, '');
        if (!coin || !ctx || asset.isDelisted || !/^[A-Z0-9][A-Z0-9._-]{0,19}$/i.test(coin)) return [];
        const price = number(ctx.markPx || ctx.midPx);
        if (price <= 0) return [];
        const previousPrice = number(ctx.prevDayPx);
        return [{
            symbol: `${dex === 'hl' ? 'HL' : 'XYZ'}:${coin.toUpperCase()}`,
            coin: dex === 'hl' ? coin : `xyz:${coin}`,
            dex,
            price,
            previousPrice,
            change: previousPrice ? price - previousPrice : 0,
            changePercent: previousPrice ? ((price - previousPrice) / previousPrice) * 100 : 0,
            funding: number(ctx.funding),
            openInterest: number(ctx.openInterest) * price,
            volume24h: number(ctx.dayNtlVlm),
            maxLeverage: number(asset.maxLeverage),
        }];
    });
}

async function info<T>(body: object): Promise<T> {
    const response = await fetch(INFO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Hyperliquid Info API: ${response.status}`);
    return response.json() as Promise<T>;
}

// Share the two metadata calls across search, dashboard, symbol pages and quote polling.
let snapshot: { markets: HyperliquidMarket[]; expires: number; staleUntil: number } | null = null;
let pending: Promise<HyperliquidMarket[]> | null = null;
export async function getHyperliquidMarkets(): Promise<HyperliquidMarket[]> {
    if (snapshot && snapshot.expires > Date.now()) return snapshot.markets;
    if (!pending) {
        pending = Promise.allSettled([
            info<unknown>({ type: 'metaAndAssetCtxs' }),
            info<unknown>({ type: 'metaAndAssetCtxs', dex: 'xyz' }),
        ]).then(([native, xyz]) => {
            if (native.status === 'rejected' && xyz.status === 'rejected') throw native.reason;
            const markets = [
                ...(native.status === 'fulfilled' ? parseHyperliquidMarkets(native.value, 'hl') : []),
                ...(xyz.status === 'fulfilled' ? parseHyperliquidMarkets(xyz.value, 'xyz') : []),
            ];
            snapshot = { markets, expires: Date.now() + 15_000, staleUntil: Date.now() + 120_000 };
            return markets;
        }).catch((error) => {
            if (snapshot && snapshot.staleUntil > Date.now()) return snapshot.markets;
            throw error;
        }).finally(() => { pending = null; });
    }
    return pending;
}

export async function getHyperliquidMarket(symbol: string) {
    if (!isHyperliquidSymbol(symbol)) return null;
    return (await getHyperliquidMarkets()).find((market) => market.symbol === symbol.toUpperCase()) ?? null;
}

export const HYPERLIQUID_INTERVALS = {
    '1m': 60_000, '5m': 300_000, '15m': 900_000, '30m': 1_800_000,
    '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000,
} as const;
export type HyperliquidInterval = keyof typeof HYPERLIQUID_INTERVALS;

export async function getHyperliquidCandles(symbol: string, interval: HyperliquidInterval): Promise<HyperliquidCandle[]> {
    const coin = hyperliquidCoin(symbol);
    if (!coin || !(interval in HYPERLIQUID_INTERVALS)) return [];
    const endTime = Date.now();
    const startTime = endTime - HYPERLIQUID_INTERVALS[interval] * 300;
    const raw = await info<RawCandle[]>({ type: 'candleSnapshot', req: { coin, interval, startTime, endTime } });
    if (!Array.isArray(raw)) return [];
    return raw.map((c) => ({ time: Math.floor(number(c.t) / 1000), open: number(c.o), high: number(c.h), low: number(c.l), close: number(c.c), volume: number(c.v) }))
        .filter((c) => c.time > 0 && c.open > 0 && c.high >= c.low && c.close > 0)
        .sort((a, b) => a.time - b.time);
}
