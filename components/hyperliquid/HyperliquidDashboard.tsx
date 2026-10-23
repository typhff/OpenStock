import Link from 'next/link';
import Panel from '@/components/Panel';
import ChangePill from '@/components/ChangePill';
import { getHyperliquidMarkets, type HyperliquidMarket } from '@/lib/hyperliquid';

const usd = (value: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
const price = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: value < 1 ? 6 : 2 }).format(value);

function MarketTable({ title, subtitle, markets }: { title: string; subtitle: string; markets: HyperliquidMarket[] }) {
    return <Panel title={title} sub={subtitle} bodyClassName="overflow-x-auto">
        <table className="data-table min-w-[600px]">
            <thead><tr><th>Contract</th><th className="is-num">Mark price</th><th className="is-num">24h</th><th className="is-num">Funding / hour</th><th className="is-num">24h volume</th><th className="is-num">Open interest</th></tr></thead>
            <tbody>{markets.map((market) => <tr key={market.symbol}>
                <td><Link className="mono font-semibold text-foreground hover:text-brand-ink" href={`/stocks/${encodeURIComponent(market.symbol)}`}>{market.symbol}</Link></td>
                <td className="is-num font-semibold">${price(market.price)}</td>
                <td className="is-num"><ChangePill value={market.changePercent} /></td>
                <td className="is-num">{(market.funding * 100).toFixed(4)}%</td>
                <td className="is-num">${usd(market.volume24h)}</td>
                <td className="is-num">${usd(market.openInterest)}</td>
            </tr>)}</tbody>
        </table>
    </Panel>;
}

export default async function HyperliquidDashboard() {
    const markets = await getHyperliquidMarkets().catch(() => []);
    const native = markets.filter((m) => m.dex === 'hl').sort((a, b) => b.volume24h - a.volume24h);
    const xyz = markets.filter((m) => m.dex === 'xyz').sort((a, b) => b.volume24h - a.volume24h);
    if (!markets.length) return <Panel title="Hyperliquid data unavailable"><p className="p-5 text-sm text-muted-foreground">The Hyperliquid Info API did not respond. Refresh to try again.</p></Panel>;
    return <div className="flex flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-3">
            <div className="bento-tile"><div className="bento-head">Native perpetuals</div><div className="bento-value">{native.length}</div><p className="text-xs text-faint">Hyperliquid base DEX</p></div>
            <div className="bento-tile"><div className="bento-head">trade[XYZ] perpetuals</div><div className="bento-value">{xyz.length}</div><p className="text-xs text-faint">HIP-3 xyz DEX</p></div>
            <div className="bento-tile"><div className="bento-head">24h notional volume</div><div className="bento-value">${usd(markets.reduce((sum, m) => sum + m.volume24h, 0))}</div><p className="text-xs text-faint">Across displayed contracts</p></div>
        </div>
        <MarketTable title="Hyperliquid native" subtitle="Most traded native perpetual contracts" markets={native.slice(0, 30)} />
        <MarketTable title="trade[XYZ]" subtitle="HIP-3 perpetual contracts on Hyperliquid; prices are contract mark prices" markets={xyz.slice(0, 30)} />
    </div>;
}
