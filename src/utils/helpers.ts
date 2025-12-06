import axios from "axios";

// Default starting value for chart candles (4.4k as per requirement)
const DEFAULT_CHART_START_VALUE = 4200;

// Helper function for time ago format
export function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

// Helper function to create baseline candle for tokens with no trades
export function createBaselineCandle(
  token: any,
  startTime: Date,
  interval: string
) {
  // Validate inputs
  if (!token || !startTime) {
    throw new Error(
      "Invalid token or startTime provided to createBaselineCandle"
    );
  }

  const currentMarketCap = token.market?.marketCap || 0;
  // Use timeframe start time for proper alignment, not current time
  const timestamp = Math.floor(startTime.getTime() / 1000);

  // Use the default starting value constant
  const defaultStartValue = DEFAULT_CHART_START_VALUE;

  // Determine if this should be marked as 1min or 5min based on interval
  const is_1_min = interval === "1m";
  const is_5_min =
    interval === "5m" || (interval === "1m" && (timestamp / 60) % 5 === 0);

  return {
    mint: token.mintAccount || "unknown",
    timestamp,
    open: defaultStartValue,
    high: Math.max(defaultStartValue, currentMarketCap), // Ensure high is at least the default start value
    low: defaultStartValue,
    close: Math.max(defaultStartValue, currentMarketCap), // Ensure close is at least the default start value
    volume: 0,
    slot: 0,
    is_5_min,
    is_1_min,
  };
}

// Helper function to calculate market cap from trade data
export function calculateMarketCapFromTrade(trade: any): number {
  // Validate trade object
  if (!trade || typeof trade !== "object") {
    return 0;
  }

  // If marketCap is directly available, use it
  if (trade.marketCap !== undefined && trade.marketCap !== null) {
    const mc = Math.abs(Number(trade.marketCap));
    return isNaN(mc) ? 0 : mc;
  }

  // If price and amount are available, calculate market cap
  if (trade.price && trade.amount) {
    const price = Number(trade.price);
    const amount = Number(trade.amount);
    if (!isNaN(price) && !isNaN(amount)) {
      return price * amount;
    }
  }

  // Fallback to 0 if no data available
  return 0;
}

// Helper function to generate OHLCV candles (Pump.fun style)
export function generateOHLCVCandles(
  trades: any[],
  interval: string,
  startTime: Date
) {
  // Validate inputs
  if (!Array.isArray(trades)) {
    console.warn(
      "generateOHLCVCandles: trades is not an array, returning empty array"
    );
    return [];
  }

  if (!trades || trades.length === 0) return [];

  let intervalMs = getIntervalInMs(interval);
  if (intervalMs <= 0) {
    console.warn("generateOHLCVCandles: invalid interval, using default 1h");
    intervalMs = 60 * 60 * 1000; // default to 1h
  }

  // Sort trades by createdAt ascending
  trades.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const grouped: Record<number, any[]> = {};
  const mint = trades[0]?.token?.mintAccount || "unknown";

  trades.forEach((trade) => {
    if (!trade.createdAt) {
      console.warn("Trade missing createdAt, skipping:", trade.id);
      return;
    }

    // Ensure we're using real timestamps, not fake ones
    const tradeTime = new Date(trade.createdAt).getTime();
    if (isNaN(tradeTime)) {
      console.warn("Invalid trade createdAt, skipping:", trade.id);
      return;
    }

    // Validate that trade time is not in the future (indicating fake timestamp)
    const now = Date.now();
    if (tradeTime > now) {
      console.warn(
        "Trade timestamp is in the future (fake timestamp), skipping:",
        trade.id,
        "timestamp:",
        new Date(tradeTime)
      );
      return;
    }

    const bucket = Math.floor((tradeTime - startTime.getTime()) / intervalMs);
    const intervalStart = startTime.getTime() + bucket * intervalMs;
    if (!grouped[intervalStart]) grouped[intervalStart] = [];
    grouped[intervalStart].push(trade);
  });

  const candles: any[] = [];

  Object.entries(grouped).forEach(([intervalStart, group], index) => {
    // Calculate market caps using the helper function
    const marketCaps = group
      .map((t) => calculateMarketCapFromTrade(t))
      .filter((mc) => mc > 0); // Only include valid market cap data

    if (marketCaps.length === 0) return; // skip if no valid market cap data

    const volumes = group
      .filter((t) => t.tokenAmount !== undefined || t.amount !== undefined)
      .map((t) => {
        const amount = Number(t.tokenAmount ?? t.amount ?? 0);
        return isNaN(amount) ? 0 : amount;
      });

    let open, close, high, low;

    // Special handling for the first candle - start from 4.4k
    if (index === 0) {
      // First candle: start from 4.4k to the last trade's marketCap in this interval
      const defaultStartValue = DEFAULT_CHART_START_VALUE;
      open = defaultStartValue;
      close = Math.max(defaultStartValue, marketCaps[marketCaps.length - 1]);
      high = Math.max(defaultStartValue, Math.max(...marketCaps));
      low = defaultStartValue;
    } else {
      // Regular candles: open should connect to previous candle's close
      const previousCandle = candles[index - 1];
      if (previousCandle) {
        open = previousCandle.close; // Connect to previous candle
      } else {
        open = marketCaps[0]; // Fallback if no previous candle
      }
      close = marketCaps[marketCaps.length - 1];
      high = Math.max(...marketCaps);
      low = Math.min(...marketCaps);
    }

    const volume = volumes.reduce((a, b) => a + b, 0);
    const lastTrade = group[group.length - 1];
    const slot = lastTrade.id || 0;
    const timestamp = Math.floor(Number(intervalStart) / 1000);

    const is_1_min = interval === "1m";
    const is_5_min =
      interval === "5m" || (interval === "1m" && (timestamp / 60) % 5 === 0);

    const candle = {
      mint,
      timestamp,
      open,
      high,
      low,
      close,
      volume,
      slot,
      is_1_min,
      is_5_min,
    };

    candles.push(candle);
  });

  // Sort candles by timestamp ascending
  candles.sort((a, b) => a.timestamp - b.timestamp);

  return candles;
}

export function getIntervalInMs(interval: string): number {
  const value = parseInt(interval);
  const unit = interval.slice(-1).toLowerCase();

  switch (unit) {
    case "h":
      return value * 60 * 60 * 1000;
    case "m":
      return value * 60 * 1000;
    default:
      return 60 * 60 * 1000; // default to 1h
  }
}

// Helper function to get start time based on timeframe
export function getTimeframeStartTime(timeframe: string): Date {
  const now = new Date();

  // Validate that current time is not fake (should be reasonable)
  const currentTime = now.getTime();
  const minValidTime = new Date("2020-01-01").getTime(); // Reasonable minimum date
  if (currentTime < minValidTime) {
    console.warn("Current time appears to be fake, using fallback:", now);
    // Fallback to a reasonable time
    return new Date(Date.now() - 24 * 60 * 60 * 1000);
  }

  switch (timeframe) {
    case "1D":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "1W":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "1M":
      // Use proper date arithmetic to avoid mutating the original date
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      return oneMonthAgo;
    case "3M":
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return threeMonthsAgo;
    case "1Y":
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return oneYearAgo;
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

/**
 * Fetch the current SOL to USD price from CoinGecko
 * Returns a number (price in USD) or null if failed
 */
// export async function getSolPriceUSD() {
//   const API_KEY = "44f7cde8-31ff-459b-9e81-d6f4517d002f"; // store your key securely

//   const url =
//     "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest";
//   try {
//     const { data } = await axios.get(url, {
//       params: {
//         symbol: "SOL",
//         convert: "USD",
//       },
//       headers: {
//         "X-CMC_PRO_API_KEY": API_KEY,
//         Accept: "application/json",
//       },
//       timeout: 5000, // optional: set a timeout
//     });
//     const price = data.data.SOL.quote.USD.price;
//     console.log("SOL price via CMC:", price);
//     return price;
//   } catch (error: any) {
//     console.error(
//       "Error fetching SOL price from CMC:",
//       error.message,
//       error.response?.data
//     );
//     // fallback to another API (e.g. CoinGecko) if needed
//     return 0;
//   }
// }

export async function getSolPriceUSD() {
  try {
    const { data } = await axios.get(
      "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT"
    );
    console.log("Pyth Sol Usd Price", parseFloat(data.price));
    return parseFloat(data.price);
  } catch (err: any) {
    console.error("Binance failed:", err.message);
    return 0;
  }
}
