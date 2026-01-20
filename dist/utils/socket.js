"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitLiveStreamChatMessage = exports.updateAllUsersLastActive = exports.getActiveUserIds = exports.getActiveUsersCount = exports.getIO = exports.emitChartUpdateOnPriceChange = exports.emitChartUpdateOnMarketChange = exports.emitChartUpdateForCoin = exports.emitChartUpdate = exports.initSocket = void 0;
// src/socket.ts
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const helpers_1 = require("./helpers");
let io;
const prisma = new client_1.PrismaClient();
// Store active chart subscriptions
const chartSubscriptions = new Map();
// Store socket to user mapping
const socketToUser = new Map();
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
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
                    }
                    else {
                        console.warn(`User with id ${userIdNum} does not exist. Skipping activity update.`);
                    }
                }
            }
            catch (error) {
                console.error("Error updating user activity:", error);
            }
        }
        // Handle chart data subscription
        socket.on("subscribe_chart", async (data) => {
            try {
                const { coinId, timeframe = "1D", interval = "1h" } = data;
                const subscriptionKey = `${coinId}_${timeframe}_${interval}`;
                // Add socket to subscription
                if (!chartSubscriptions.has(subscriptionKey)) {
                    chartSubscriptions.set(subscriptionKey, new Set());
                }
                chartSubscriptions.get(subscriptionKey).add(socket.id);
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
                console.log(`📊 Chart subscription added: ${socket.id} -> ${subscriptionKey}`);
            }
            catch (error) {
                console.error("Error subscribing to chart:", error);
                socket.emit("chart_data", {
                    success: false,
                    error: "Failed to subscribe to chart data",
                });
            }
        });
        // Handle chart data unsubscription
        socket.on("unsubscribe_chart", (data) => {
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
            console.log(`📊 Chart subscription removed: ${socket.id} -> ${subscriptionKey}`);
        });
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
                    }
                    else {
                        console.warn(`User with id ${userId} does not exist on disconnect. Skipping activity update.`);
                    }
                    // Remove socket to user mapping
                    socketToUser.delete(socket.id);
                }
                catch (error) {
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
exports.initSocket = initSocket;
// Function to get chart data (same as controller)
async function getChartData(coinId, timeframe, interval) {
    try {
        console.log("timeframe", timeframe);
        const startTime = (0, helpers_1.getTimeframeStartTime)(timeframe);
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
        console.log("token", token);
        console.log("startTime", startTime);
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
        console.log("trades.lengthcccccc", trades.length);
        // If no trades exist, create a baseline candle from 4.4k to current market cap
        if (trades.length === 0) {
            const { createBaselineCandle } = await Promise.resolve().then(() => __importStar(require("./helpers")));
            const baselineCandle = createBaselineCandle(token, startTime, interval);
            return [baselineCandle];
        }
        // Process trades into OHLCV candles based on interval
        const chartData = await (0, helpers_1.generateOHLCVCandles)(trades, interval, startTime);
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
    }
    catch (error) {
        console.error("Error getting chart data in socket:", error);
        return [];
    }
}
// Function to emit live chart updates
const emitChartUpdate = async (coinId, timeframe = "1D", interval = "1h") => {
    try {
        const subscriptionKey = `${coinId}_${timeframe}_${interval}`;
        const subscription = chartSubscriptions.get(subscriptionKey);
        console.log(`📊 Emitting chart update for ${subscriptionKey}, subscribers: ${subscription?.size || 0}`);
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
            console.log(`✅ Chart update emitted for ${subscriptionKey} with ${chartData.length} candles`);
        }
        else {
            console.log(`ℹ️ No active subscribers for ${subscriptionKey}`);
        }
    }
    catch (error) {
        console.error("Error emitting chart update:", error);
    }
};
exports.emitChartUpdate = emitChartUpdate;
// Function to emit chart update for all timeframes/intervals of a coin
const emitChartUpdateForCoin = async (coinId) => {
    const timeframes = ["1D", "1W", "1M", "3M", "1Y"];
    const intervals = ["1m", "5m", "1h", "4h", "1D"];
    console.log(`🔄 Emitting chart updates for coin ${coinId} across all timeframes and intervals`);
    for (const timeframe of timeframes) {
        for (const interval of intervals) {
            await (0, exports.emitChartUpdate)(coinId, timeframe, interval);
        }
    }
};
exports.emitChartUpdateForCoin = emitChartUpdateForCoin;
// Function to emit chart update when market data changes
const emitChartUpdateOnMarketChange = async (tokenId) => {
    try {
        console.log(`📈 Market data changed for token ${tokenId}, emitting chart updates`);
        await (0, exports.emitChartUpdateForCoin)(tokenId.toString());
    }
    catch (error) {
        console.error("Error emitting chart update on market change:", error);
    }
};
exports.emitChartUpdateOnMarketChange = emitChartUpdateOnMarketChange;
// Function to emit chart update when token price changes
const emitChartUpdateOnPriceChange = async (tokenId) => {
    try {
        console.log(`💰 Price changed for token ${tokenId}, emitting chart updates`);
        await (0, exports.emitChartUpdateForCoin)(tokenId.toString());
    }
    catch (error) {
        console.error("Error emitting chart update on price change:", error);
    }
};
exports.emitChartUpdateOnPriceChange = emitChartUpdateOnPriceChange;
const getIO = () => {
    if (!io)
        throw new Error("Socket.io not initialized");
    return io;
};
exports.getIO = getIO;
// Function to get active users count
const getActiveUsersCount = () => {
    return socketToUser.size;
};
exports.getActiveUsersCount = getActiveUsersCount;
// Function to get all active user IDs
const getActiveUserIds = () => {
    return Array.from(socketToUser.values());
};
exports.getActiveUserIds = getActiveUserIds;
// Function to update lastActive for all connected users
const updateAllUsersLastActive = async () => {
    const userIds = (0, exports.getActiveUserIds)();
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
        }
        catch (error) {
            console.error("Error updating lastActive for all users:", error);
        }
    }
};
exports.updateAllUsersLastActive = updateAllUsersLastActive;
// Set up periodic lastActive updates (every 5 minutes)
setInterval(exports.updateAllUsersLastActive, 5 * 60 * 1000);
// Function to emit a new livestream chat message to all clients
const emitLiveStreamChatMessage = (message) => {
    if (!io)
        throw new Error("Socket.io not initialized");
    io.emit("livestream_chat_message", message);
};
exports.emitLiveStreamChatMessage = emitLiveStreamChatMessage;
