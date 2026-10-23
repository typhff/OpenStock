# Market support

OpenStock uses Finnhub, TradingView embeds, and the public Hyperliquid Info API. Hyperliquid coverage was checked against the live API in October 2026.

| Market | Charts | Quotes, watchlist prices, alerts |
|---|---|---|
| 🇺🇸 United States (NYSE, Nasdaq, AMEX) | Live | Yes |
| Crypto (Binance pairs, e.g. `BINANCE:BTCUSDT`) | Live | Yes |
| Hyperliquid native perps (`HL:BTC`) | Native candles from Hyperliquid | Yes, from Hyperliquid |
| trade[XYZ] HIP-3 perps (`XYZ:NVDA`) | Native candles from Hyperliquid | Yes, from Hyperliquid |
| Forex (e.g. `FX:EURUSD`) | Live | No |
| 🇨🇦 Canada (TSX) | Delayed | No |
| 🇦🇺 Australia (ASX) | Delayed | No |
| 🇮🇳 India, through BSE (`.BO`; `.NS` symbols are charted on BSE) | End of day | No |
| 🇩🇪 Germany (Xetra) | End of day | No |
| India NSE (charted on BSE instead) | Blocked in embeds | No |
| London, Tokyo, Hong Kong, Korea, Taiwan, Singapore, New Zealand, Thailand, Malaysia, Istanbul, TSX Venture, Mexico, Johannesburg | Candle chart blocked; financials, technicals and profile work | No |
| Index tickers such as NIFTY, FTSE 100, DAX, Nikkei 225, Hang Seng | Blocked in embeds | No |

## What that means in the app

- **Dashboard:** pick a market (US, India, Germany, Canada, Australia, Crypto, Forex, Hyperliquid). The Hyperliquid view lists its native and trade[XYZ] perpetual markets by 24-hour volume.
- **Symbol pages:** US stocks and Binance pairs use Finnhub quotes; other conventional exchange symbols use TradingView's quote panel. Hyperliquid perps have their own price and candle view.
- **Alerts:** available in realtime mode for US stocks, Binance pairs, and Hyperliquid perpetuals. Hyperliquid alerts use the contract mark price.
- **Hyperliquid symbol pages:** show mark price, funding, notional volume, open interest and candles. The chart defaults to 5 minutes and remembers the chosen interval separately for each contract in this browser. These are perpetual contracts, not shares of the named company.
- **Search:** Finnhub search returns listings worldwide. On exchanges whose chart is blocked, the stock page links to the chart on TradingView instead (the list is `CHART_BLOCKED_EXCHANGES` in `lib/utils.ts`, each confirmed with two tickers).

## Adding a market

TradingView embed markets are configured in `lib/markets.ts`. The Hyperliquid adapter is in `lib/hyperliquid.ts` and needs no API key. It covers native perpetuals and the `xyz` HIP-3 DEX; other HIP-3 DEXs are not yet included.
