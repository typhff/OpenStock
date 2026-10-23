'use client';

import { useEffect, useRef, useState } from 'react';
import { CandlestickSeries, ColorType, createChart, type UTCTimestamp } from 'lightweight-charts';
import type { HyperliquidCandle, HyperliquidInterval } from '@/lib/hyperliquid';
import { HYPERLIQUID_INTERVALS } from '@/lib/hyperliquid';

const intervals = Object.keys(HYPERLIQUID_INTERVALS) as HyperliquidInterval[];

export default function HyperliquidChart({ symbol }: { symbol: string }) {
    const container = useRef<HTMLDivElement>(null);
    const [interval, setIntervalValue] = useState<HyperliquidInterval>('5m');
    const [ready, setReady] = useState(false);
    const [error, setError] = useState('');
    const [candles, setCandles] = useState<HyperliquidCandle[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem(`openstock:hyperliquid:interval:${symbol}`);
        setIntervalValue(saved && saved in HYPERLIQUID_INTERVALS ? saved as HyperliquidInterval : '5m');
        setReady(true);
    }, [symbol]);

    useEffect(() => {
        if (!ready) return;
        let cancelled = false;
        setError('');
        setCandles([]);
        const load = async () => {
            try {
                const response = await fetch(`/api/hyperliquid/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}`);
                if (!response.ok) throw new Error('Could not load candles');
                const data = await response.json() as HyperliquidCandle[];
                if (!cancelled) setCandles(data);
            } catch {
                if (!cancelled) setError('Chart data is temporarily unavailable.');
            }
        };
        void load();
        const timer = setInterval(load, 60_000);
        return () => { cancelled = true; clearInterval(timer); };
    }, [symbol, interval, ready]);

    useEffect(() => {
        if (!container.current || !candles.length) return;
        const host = container.current;
        const chart = createChart(host, {
            width: host.clientWidth, height: 440,
            layout: { textColor: '#9aa5b1', background: { type: ColorType.Solid, color: '#10171c' }, fontFamily: 'Inter, sans-serif' },
            grid: { vertLines: { color: '#1f2a30' }, horzLines: { color: '#1f2a30' } },
            rightPriceScale: { borderColor: '#344149' },
            timeScale: { borderColor: '#344149', timeVisible: true, secondsVisible: false },
        });
        const series = chart.addSeries(CandlestickSeries, {
            upColor: '#16b68a', downColor: '#e66c68', borderVisible: false,
            wickUpColor: '#16b68a', wickDownColor: '#e66c68',
        });
        series.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })));
        chart.timeScale().fitContent();
        const resize = new ResizeObserver(() => chart.applyOptions({ width: host.clientWidth }));
        resize.observe(host);
        return () => { resize.disconnect(); chart.remove(); };
    }, [candles]);

    return <div className="p-3">
        <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Candle interval">
            {intervals.map((item) => <button key={item} type="button" aria-pressed={interval === item} onClick={() => {
                setIntervalValue(item);
                localStorage.setItem(`openstock:hyperliquid:interval:${symbol}`, item);
            }} className={`pill mono h-7 px-2.5 ${interval === item ? 'bg-brand-soft text-brand-ink' : 'hover:bg-hover'}`}>{item}</button>)}
        </div>
        {error && <p role="status" className="mb-2 text-sm text-muted-foreground">{error}</p>}
        <div ref={container} className="min-h-[440px] w-full" aria-label={`${symbol} ${interval} candlestick chart`} />
        <p className="mt-2 text-right text-xs text-faint">Candles: Hyperliquid · Chart: <a href="https://www.tradingview.com/lightweight-charts/" target="_blank" rel="noopener noreferrer" className="underline">TradingView Lightweight Charts</a></p>
    </div>;
}
