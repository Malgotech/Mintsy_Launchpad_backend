// src/socket.ts
import { Server, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import {
  generateOHLCVCandles,
  getTimeframeStartTime,
  getSolPriceUSD,
} from "./helpers";

let io: Server;
const prisma = new PrismaClient();

// Store active chart subscriptions
const chartSubscriptions = new Map<string, Set<string>>();

// Store socket to user mapping
const socketToUser = new Map<string, number>();

export const initSocket = (server: any) => {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", async (socket) => {
    console.log("🟢 Client connected:", socket.id);

    // Handle user activity tracking
    const userId = socket.handshake.query.userId;
    if (userId && typeof userId === "string") {
      try {
        const userIdNum = parseInt(userId);
        if (!isNaN(userIdNum)) {
          // Check if user exists before updating
          const user = await prisma.user.findUnique({
            where: { id: userIdNum },
          });
          if (user) {
            // Update user as active
            await prisma.user.update({
              where: { id: userIdNum },
              data: {
                isActive: true,
                lastActive: new Date(),
              },
            });
            // Store socket to user mapping
            socketToUser.set(socket.id, userIdNum);
            console.log(`👤 User ${userIdNum} is now active`);
          } else {
            console.warn(
              `User with id ${userIdNum} does not exist. Skipping activity update.`
            );
          }
        }
      } catch (error) {
        console.error("Error updating user activity:", error);
      }
    }

    // Handle chart data subscription
    socket.on(
      "subscribe_chart",
      async (data: {
        coinId: string;
        timeframe?: string;
        interval?: string;
      }) => {
        try {
          const { coinId, timeframe = "1D", interval = "1h" } = data;
          const subscriptionKey = `${coinId}_${timeframe}_${interval}`;

          // Add socket to subscription
          if (!chartSubscriptions.has(subscriptionKey)) {
            chartSubscriptions.set(subscriptionKey, new Set());
          }
          chartSubscriptions.get(subscriptionKey)!.add(socket.id);

          // Join socket room for this subscription
          socket.join(subscriptionKey);

          // Send initial chart data
          const chartData = await getChartData(coinId, timeframe, interval);
          socket.emit("chart_data", {
            success: true,
            data: {
              timeframe: timeframe,
              interval: interval,
              data: chartData,
            },
          });

          console.log(
            `📊 Chart subscription added: ${socket.id} -> ${subscriptionKey}`
          );
        } catch (error) {
          console.error("Error subscribing to chart:", error);
          socket.emit("chart_data", {
            success: false,
            error: "Failed to subscribe to chart data",
          });
        }
      }
    );

    // Handle chart data unsubscription
    socket.on(
      "unsubscribe_chart",
      (data: { coinId: string; timeframe?: string; interval?: string }) => {
        const { coinId, timeframe = "1D", interval = "1h" } = data;
        const subscriptionKey = `${coinId}_${timeframe}_${interval}`;

        // Remove socket from subscription
        const subscription = chartSubscriptions.get(subscriptionKey);
        if (subscription) {
          subscription.delete(socket.id);
          if (subscription.size === 0) {
            chartSubscriptions.delete(subscriptionKey);
          }
        }

        // Leave socket room
        socket.leave(subscriptionKey);

        console.log(
          `📊 Chart subscription removed: ${socket.id} -> ${subscriptionKey}`
        );
      }
    );

    socket.on("disconnect", async () => {
      console.log("🔴 Client disconnected:", socket.id);

      // Handle user activity tracking on disconnect
      const userId = socketToUser.get(socket.id);
      if (userId) {
        try {
          // Check if user exists before updating
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (user) {
            // Update user as inactive and set last active time
            await prisma.user.update({
              where: { id: userId },
              data: {
                isActive: false,
                lastActive: new Date(),
              },
            });
            console.log(`👤 User ${userId} is now inactive`);
          } else {
            console.warn(
              `User with id ${userId} does not exist on disconnect. Skipping activity update.`
            );
          }
          // Remove socket to user mapping
          socketToUser.delete(socket.id);
        } catch (error) {
          console.error("Error updating user activity on disconnect:", error);
        }
      }

      // Clean up subscriptions for this socket
      chartSubscriptions.forEach((sockets, key) => {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            chartSubscriptions.delete(key);
          }
        }
      });
    });
  });

  return io;
};

// Function to get chart data (same as controller)
async function getChartData(
  coinId: string,
  timeframe: string,
  interval: string
) {
  try {
    const startTime = getTimeframeStartTime(timeframe);

    // First, get the token and market data to understand the current state
    const token = await prisma.token.findFirst({
      where: {
        OR: [
          // Try to find by ID if coinId is a number
          ...(isNaN(Number(coinId)) ? [] : [{ id: Number(coinId) }]),
          // Try to find by mintAccount if it looks like a mint address
          ...(coinId.length > 20 ? [{ mintAccount: coinId }] : []),
          // Try to find by symbol (usually short strings)
          ...(coinId.length <= 10 ? [{ symbol: coinId }] : []),
        ],
      },
      include: {
        market: true,
      },
    });

    if (!token) {
      throw new Error("Token not found");
    }

    const trades = await prisma.trade.findMany({
      where: {
        tokenId: token.id,
        createdAt: {
          gte: startTime,
        },
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
      const { createBaselineCandle } = await import("./helpers");
      const baselineCandle = createBaselineCandle(token, startTime, interval);
      return [baselineCandle];
    }

    // Process trades into OHLCV candles based on interval
    const chartData = generateOHLCVCandles(trades, interval, startTime);

    return chartData.map((point) => ({
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
    }));
  } catch (error) {
    console.error("Error getting chart data in socket:", error);
    return [];
  }
}

// Function to emit live chart updates
export const emitChartUpdate = async (
  coinId: string,
  timeframe: string = "1D",
  interval: string = "1h"
) => {
  try {
    const subscriptionKey = `${coinId}_${timeframe}_${interval}`;
    const subscription = chartSubscriptions.get(subscriptionKey);

    console.log(
      `📊 Emitting chart update for ${subscriptionKey}, subscribers: ${
        subscription?.size || 0
      }`
    );

    if (subscription && subscription.size > 0) {
      const chartData = await getChartData(coinId, timeframe, interval);

      const updateData = {
        success: true,
        data: {
          timeframe: timeframe,
          interval: interval,
          data: chartData,
        },
      };

      // Emit to the specific room
      io.to(subscriptionKey).emit("chart_update", updateData);

      // Also emit chart_data for backward compatibility
      io.to(subscriptionKey).emit("chart_data", updateData);

      console.log(
        `✅ Chart update emitted for ${subscriptionKey} with ${chartData.length} candles`
      );
    } else {
      console.log(`ℹ️ No active subscribers for ${subscriptionKey}`);
    }
  } catch (error) {
    console.error("Error emitting chart update:", error);
  }
};

// Function to emit chart update for all timeframes/intervals of a coin
export const emitChartUpdateForCoin = async (coinId: string) => {
  const timeframes = ["1D", "1W", "1M", "3M", "1Y"];
  const intervals = ["1m", "5m", "1h", "4h", "1D"];

  console.log(
    `🔄 Emitting chart updates for coin ${coinId} across all timeframes and intervals`
  );

  for (const timeframe of timeframes) {
    for (const interval of intervals) {
      await emitChartUpdate(coinId, timeframe, interval);
    }
  }
};

// Function to emit chart update when market data changes
export const emitChartUpdateOnMarketChange = async (tokenId: number) => {
  try {
    console.log(
      `📈 Market data changed for token ${tokenId}, emitting chart updates`
    );
    await emitChartUpdateForCoin(tokenId.toString());
  } catch (error) {
    console.error("Error emitting chart update on market change:", error);
  }
};

// Function to emit chart update when token price changes
export const emitChartUpdateOnPriceChange = async (tokenId: number) => {
  try {
    console.log(
      `💰 Price changed for token ${tokenId}, emitting chart updates`
    );
    await emitChartUpdateForCoin(tokenId.toString());
  } catch (error) {
    console.error("Error emitting chart update on price change:", error);
  }
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

// Function to get active users count
export const getActiveUsersCount = () => {
  return socketToUser.size;
};

// Function to get all active user IDs
export const getActiveUserIds = () => {
  return Array.from(socketToUser.values());
};

// Function to update lastActive for all connected users
export const updateAllUsersLastActive = async () => {
  const userIds = getActiveUserIds();
  if (userIds.length > 0) {
    try {
      await prisma.user.updateMany({
        where: {
          id: {
            in: userIds,
          },
        },
        data: {
          lastActive: new Date(),
        },
      });
    } catch (error) {
      console.error("Error updating lastActive for all users:", error);
    }
  }
};

// Set up periodic lastActive updates (every 5 minutes)
setInterval(updateAllUsersLastActive, 5 * 60 * 1000);

// Function to emit a new livestream chat message to all clients
export const emitLiveStreamChatMessage = (message: any) => {
  if (!io) throw new Error("Socket.io not initialized");
  io.emit("livestream_chat_message", message);
};
