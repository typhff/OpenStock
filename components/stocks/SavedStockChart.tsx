'use client';

import { useEffect, useState } from 'react';
import TradingViewWidget from '@/components/TradingViewWidget';
import { CANDLE_CHART_WIDGET_CONFIG } from '@/lib/constants';

const INTERVALS = [
    ['1', '1m'], ['5', '5m'], ['15', '15m'], ['30', '30m'],
    ['60', '1h'], ['240', '4h'], ['D', '1D'], ['W', '1W'], ['M', '1M'],
] as const;

const STYLES = [
    [0, 'Bars'], [1, 'Candles'], [2, 'Line'], [3, 'Area'],
] as const;

type ChartSettings = {
    interval: typeof INTERVALS[number][0];
    style: typeof STYLES[number][0];
};

const DEFAULT_SETTINGS: ChartSettings = { interval: '5', style: 1 };
const STORAGE_PREFIX = 'openstock:stock-chart:v1:';

function isChartSettings(value: unknown): value is ChartSettings {
    if (!value || typeof value !== 'object') return false;
    const settings = value as Record<string, unknown>;
    return INTERVALS.some(([interval]) => interval === settings.interval)
        && STYLES.some(([style]) => style === settings.style);
}

export default function SavedStockChart({ symbol }: { symbol: string }) {
    const [settings, setSettings] = useState<ChartSettings | null>(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(`${STORAGE_PREFIX}${symbol}`);
            const parsed: unknown = stored ? JSON.parse(stored) : null;
            setSettings(isChartSettings(parsed) ? parsed : DEFAULT_SETTINGS);
        } catch {
            setSettings(DEFAULT_SETTINGS);
        }
    }, [symbol]);

    function updateSettings(next: ChartSettings) {
        setSettings(next);
        try {
            localStorage.setItem(`${STORAGE_PREFIX}${symbol}`, JSON.stringify(next));
        } catch { /* Browsers can disable or fill local storage. */ }
    }

    if (!settings) return <div className="tv-frame" style={{ height: 560 }} aria-label="Loading chart preferences" />;

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 px-1 pt-1 text-[12px] text-faint">
                <label className="flex items-center gap-1.5">
                    <span>Interval</span>
                    <select
                        aria-label="Chart interval"
                        className="rounded-md border border-line bg-card px-2 py-1 text-foreground"
                        value={settings.interval}
                        onChange={(event) => updateSettings({ ...settings, interval: event.target.value as ChartSettings['interval'] })}
                    >
                        {INTERVALS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </label>
                <label className="flex items-center gap-1.5">
                    <span>Style</span>
                    <select
                        aria-label="Chart style"
                        className="rounded-md border border-line bg-card px-2 py-1 text-foreground"
                        value={settings.style}
                        onChange={(event) => updateSettings({ ...settings, style: Number(event.target.value) as ChartSettings['style'] })}
                    >
                        {STYLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </label>
                <span className="ml-auto">Use these controls to save changes · TradingView toolbar changes are temporary</span>
            </div>
            <TradingViewWidget
                scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
                config={{ ...CANDLE_CHART_WIDGET_CONFIG(symbol), ...settings }}
                height={560}
                allowExpand
            />
        </div>
    );
}
