import Link from 'next/link';
import Panel from '@/components/Panel';
import ChangePill from '@/components/ChangePill';
import WatchlistButton from '@/components/WatchlistButton';
import StockLivePrice from '@/components/stocks/StockLivePrice';
import CreateAlertModal from '@/components/watchlist/CreateAlertModal';
import { Bell } from 'lucide-react';
import HyperliquidChart from '@/components/hyperliquid/HyperliquidChart';
import { isStockInWatchlist } from '@/lib/actions/watchlist.actions';
import { getHyperliquidMarket } from '@/lib/hyperliquid';

const number = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);

export default async function HyperliquidDetails({ symbol }: { symbol: string }) {
    const [market, watched] = await Promise.all([
        getHyperliquidMarket(symbol).catch(() => null),
        isStockInWatchlist(symbol),
    ]);
    if (!market) return <Panel title="Contract unavailable"><p className="p-5 text-sm text-muted-foreground">This contract was not found in Hyperliquid&apos;s active markets, or its API is unavailable.</p></Panel>;
    const quote = { c: market.price, d: market.change, dp: market.changePercent, pc: market.previousPrice, t: Math.floor(Date.now() / 1000) };
    const stats = [
        ['24h change', <ChangePill key="change" value={market.changePercent} />],
        ['Funding / hour', `${(market.funding * 100).toFixed(4)}%`],
        ['24h volume', `$${number(market.volume24h)}`],
        ['Open interest', `$${number(market.openInterest)}`],
    ] as const;
    return <>
        <section className="hatch">
            <div className="card flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1"><h1 className="mono text-xl font-bold">{market.symbol}</h1><p className="text-xs text-faint">{market.dex === 'xyz' ? 'trade[XYZ] HIP-3' : 'Hyperliquid native'} perpetual · mark price · USD</p></div>
                <StockLivePrice symbol={market.symbol} initial={quote} currency="USD" hyperliquid />
                <WatchlistButton symbol={market.symbol} company={`${market.symbol} perpetual`} isInWatchlist={watched} />
                <CreateAlertModal symbol={market.symbol} currentPrice={market.price} currency="USD"><button type="button" className="btn btn-primary"><Bell /> Set alert</button></CreateAlertModal>
            </div>
            <div className="bento mt-[3px]">{stats.map(([label, value]) => <div className="bento-tile gap-2" key={label}><div className="bento-head">{label}</div><div className="num text-lg font-semibold">{value}</div></div>)}</div>
        </section>
        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]">
            <Panel title="Price chart" sub="Direct candle data from Hyperliquid"><HyperliquidChart symbol={market.symbol} /></Panel>
            <Panel title="Contract details" sub="Perpetual contract, not the underlying asset">
                <dl className="space-y-3 p-4 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-faint">DEX</dt><dd>{market.dex === 'xyz' ? 'trade[XYZ]' : 'Hyperliquid'}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-faint">Max leverage</dt><dd>{market.maxLeverage}×</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-faint">Previous day price</dt><dd>${number(market.previousPrice)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-faint">Oracle asset</dt><dd className="mono">{market.coin}</dd></div>
                </dl>
                <div className="border-t border-line p-4 text-xs text-faint">For market data only. <Link href="/dashboard?market=hyperliquid" className="underline">Browse Hyperliquid contracts</Link>.</div>
            </Panel>
        </div>
    </>;
}
