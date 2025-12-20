"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const client_1 = require("@prisma/client"); // adjust relative path accordingly
const prisma = new client_1.PrismaClient();
class SearchController {
    constructor() {
        this.search = async (req, res) => {
            try {
                const { q = "", limit = 10, type = "all" } = req.query;
                const searchTerm = q.toLowerCase();
                let whereClause = {
                    OR: [
                        { name: { contains: searchTerm, mode: "insensitive" } },
                        { symbol: { contains: searchTerm, mode: "insensitive" } },
                        { description: { contains: searchTerm, mode: "insensitive" } },
                        { mintAccount: { contains: searchTerm, mode: "insensitive" } },
                    ],
                };
                if (type !== "all") {
                    whereClause.type = type;
                }
                const tokens = await prisma.token.findMany({
                    where: whereClause,
                    take: Number(limit),
                    include: {
                        market: true,
                    },
                });
                const results = tokens.map((token) => ({
                    id: token.id.toString(),
                    type: "coin",
                    name: token.name,
                    symbol: token.symbol,
                    mint: token.mintAccount,
                    imageSrc: token.imageUrl,
                    cid: token.cid,
                    marketCap: `$${(token.market?.marketCap || 0).toLocaleString()}`,
                    network: token.network || "solana",
                }));
                // Get suggestions based on partial matches
                const suggestions = await prisma.token.findMany({
                    where: {
                        name: { startsWith: searchTerm, mode: "insensitive" },
                    },
                    select: { name: true },
                    take: 5,
                });
                const totalResults = await prisma.token.count({ where: whereClause });
                return res.json({
                    success: true,
                    data: {
                        results,
                        suggestions: suggestions.map((s) => s.name.toUpperCase()),
                        totalResults,
                    },
                });
            }
            catch (error) {
                console.error("Error in search:", error);
                return res.status(500).json({
                    success: false,
                    error: "Internal Server Error",
                });
            }
        };
    }
}
exports.SearchController = SearchController;
