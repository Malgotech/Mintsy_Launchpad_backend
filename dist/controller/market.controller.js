"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketController = void 0;
const client_1 = require("@prisma/client");
const socket_1 = require("../utils/socket");
const prisma = new client_1.PrismaClient();
class MarketController {
    // Create a new market
    async createMarket(req, res) {
        try {
            const { tokenId, currentPrice, priceChange, volume24h, liquidity } = req.body;
            const market = await prisma.market.create({
                data: {
                    tokenId,
                    currentPrice,
                    priceChange,
                    volume24h,
                    liquidity,
                },
            });
            return res.status(201).json(market);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            return res.status(500).json({ error: errorMessage });
        }
    }
    // Get all markets
    async getMarkets(req, res) {
        try {
            const markets = await prisma.market.findMany({
                include: {
                    token: true,
                    trades: true,
                },
            });
            return res.json(markets);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            return res.status(500).json({ error: errorMessage });
        }
    }
    // Get market by ID
    async getMarketById(req, res) {
        try {
            const { id } = req.params;
            const market = await prisma.market.findUnique({
                where: { id: Number(id) },
                include: {
                    token: true,
                    trades: true,
                },
            });
            if (!market) {
                return res.status(404).json({ error: "Market not found" });
            }
            return res.json(market);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            return res.status(500).json({ error: errorMessage });
        }
    }
    // Update market
    async updateMarket(req, res) {
        try {
            const { id } = req.params;
            const updatableFields = [
                "currentPrice",
                "priceChange",
                "marketCap",
                "ratio",
                "priceChange24h",
                "volume24h",
                "liquidity",
                "solCollected",
            ];
            // Only pick fields that exist in req.body
            const data = updatableFields.reduce((acc, field) => {
                if (field in req.body) {
                    acc[field] = req.body[field];
                }
                return acc;
            }, {});
            console.log(data, "xxxx");
            if (Object.keys(data).length === 0) {
                return res
                    .status(400)
                    .json({ error: "No valid fields provided for update." });
            }
            const market = await prisma.market.update({
                where: { id: Number(id) },
                data,
            });
            // Emit chart updates when market data changes
            try {
                await (0, socket_1.emitChartUpdateOnMarketChange)(market.tokenId);
            }
            catch (error) {
                console.error("Error emitting chart update on market change:", error);
            }
            return res.json(market);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            return res.status(500).json({ error: errorMessage });
        }
    }
    // Delete market
    async deleteMarket(req, res) {
        try {
            const { id } = req.params;
            await prisma.market.delete({
                where: { id: Number(id) },
            });
            return res.status(204).send();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            return res.status(500).json({ error: errorMessage });
        }
    }
}
exports.MarketController = MarketController;
exports.default = new MarketController();
