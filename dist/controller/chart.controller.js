"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartController = void 0;
const client_1 = require("@prisma/client"); // adjust relative path accordingly
const helpers_1 = require("../utils/helpers");
const prisma = new client_1.PrismaClient();
class ChartController {
  constructor() {
    this.getCoinChartData = async (req, res) => {
      try {
        const { coinId } = req.params;
        const { timeframe = "1D", interval = "1h" } = req.query;
        const startTime = (0, helpers_1.getTimeframeStartTime)(timeframe);
        // First, get the token and market data to understand the current state
        const token = await prisma.token.findFirst({
          where: {
            OR: [
              { id: Number(coinId) },
              { mintAccount: coinId },
              { symbol: coinId },
            ],
          },
          include: {
            market: true,
          },
        });
        if (!token) {
          return res.status(404).json({
            success: false,
            error: "Token not found",
          });
        }
        const trades = await prisma.trade.findMany({
          where: {
            tokenId: token.id,
            // createdAt: {
            //     gte: startTime,
            // },
          },
          orderBy: {
            createdAt: "asc",
          },
          include: {
            token: true,
            market: true,
          },
        });
        // If no trades exist, create a baseline candle from 4.4k to current market cap
        if (trades.length === 0) {
          const baselineCandle = await (0, helpers_1.createBaselineCandle)(
            token,
            startTime,
            interval
          );
          return res.json({
            success: true,
            data: {
              timeframe: timeframe,
              interval: interval,
              data: [baselineCandle],
            },
          });
        }
        // Process trades into OHLCV candles based on interval
        const chartData = await (0, helpers_1.generateOHLCVCandles)(
          trades,
          interval,
          startTime
        );
        console.log("chartData......", chartData);
        return res.json({
          success: true,
          data: {
            timeframe: timeframe,
            interval: interval,
            data: chartData.map((point) => ({
              mint: point.mint,
              timestamp: point.timestamp,
              open: point.open,
              high: point.high,
              low: point.low,
              close: point.close,
              volume: point.volume,
              slot: point.slot,
              is_5_min: point.is_5_min,
              is_1_min: point.is_1_min,
            })),
          },
        });
      } catch (error) {
        console.error("Error getting chart data:", error);
        return res.status(500).json({
          success: false,
          error: "Internal Server Error",
        });
      }
    };
  }
}
exports.ChartController = ChartController;
