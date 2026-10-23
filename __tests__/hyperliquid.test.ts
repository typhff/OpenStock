import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHyperliquidCandles, hyperliquidCoin, isHyperliquidSymbol, parseHyperliquidMarkets } from '@/lib/hyperliquid';

afterEach(() => vi.unstubAllGlobals());

describe('Hyperliquid market adapter', () => {
    it('keeps native and trade[XYZ] perps distinct from underlying symbols', () => {
        expect(hyperliquidCoin('HL:BTC')).toBe('BTC');
        expect(hyperliquidCoin('XYZ:NVDA')).toBe('xyz:NVDA');
        expect(isHyperliquidSymbol('NVDA')).toBe(false);
        expect(hyperliquidCoin('XYZ:<script>')).toBeNull();
    });

    it('aligns universe assets with contexts and skips unavailable contracts', () => {
        const markets = parseHyperliquidMarkets([
            { universe: [{ name: 'xyz:NVDA', maxLeverage: 20 }, { name: 'xyz:OLD', isDelisted: true }, { name: 'xyz:EMPTY' }] },
            [{ markPx: '210', prevDayPx: '200', funding: '0.0001', dayNtlVlm: '10000', openInterest: '10' }, { markPx: '5' }, { markPx: '0' }],
        ], 'xyz');
        expect(markets).toHaveLength(1);
        expect(markets[0]).toMatchObject({ symbol: 'XYZ:NVDA', price: 210, change: 10, changePercent: 5, openInterest: 2100, maxLeverage: 20 });
    });

    it('requests xyz candles with the API coin name and converts timestamps to seconds', async () => {
        const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ t: 300000, o: '10', h: '12', l: '9', c: '11', v: '2' }] });
        vi.stubGlobal('fetch', fetch);
        const candles = await getHyperliquidCandles('XYZ:NVDA', '5m');
        expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ type: 'candleSnapshot', req: { coin: 'xyz:NVDA', interval: '5m' } });
        expect(candles).toEqual([{ time: 300, open: 10, high: 12, low: 9, close: 11, volume: 2 }]);
    });
});
