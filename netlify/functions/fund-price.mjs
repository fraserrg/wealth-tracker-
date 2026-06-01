// Fetches live price data for Vanguard FTSE All-World UCITS ETF (VWRP.L)
// VWRP is the closest exchange-listed proxy for the Vanguard FTSE Global All Cap Index Fund.
// The All Cap fund itself is an unlisted OEIC priced daily via NAV; no public real-time API exists.
export default async (req) => {
  const symbol = 'VWRP.L';

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Yahoo Finance returned HTTP ${res.status}`);
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];

    if (!result) {
      throw new Error('No chart data in Yahoo Finance response');
    }

    const meta = result.meta;
    let price = meta.regularMarketPrice;
    let previousClose = meta.chartPreviousClose ?? meta.previousClose;
    const rawCurrency = meta.currency;

    // LSE-listed ETFs on Yahoo Finance are typically quoted in GBX (pence sterling).
    // Divide by 100 to convert to GBP.
    if (rawCurrency === 'GBp' || rawCurrency === 'GBX') {
      price = price / 100;
      previousClose = previousClose / 100;
    }

    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;

    const data = {
      symbol,
      name: 'Vanguard FTSE All-World UCITS ETF (VWRP)',
      description: 'LSE-listed ETF — closest listed proxy for Vanguard FTSE Global All Cap',
      price: Math.round(price * 100) / 100,
      previousClose: Math.round(previousClose * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      currency: 'GBP',
      marketState: meta.marketState,
      exchangeTimezone: meta.exchangeTimezoneName,
      lastUpdated: new Date().toISOString(),
    };

    return Response.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'public, max-age=300' } }
    );
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
};

export const config = {
  path: '/api/fund-price',
};
