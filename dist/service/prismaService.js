"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// src/services/prismaService.ts
const client_1 = require("@prisma/client");
const socket_1 = require("../utils/socket");
exports.prisma = new client_1.PrismaClient();
const prismaService = {
    // User
    createUser: (data) => exports.prisma.user.create({ data }),
    getUser: (id) => exports.prisma.user.findUnique({ where: { id: parseInt(id) } }),
    getUsers: () => exports.prisma.user.findMany(),
    updateUser: (id, data) => exports.prisma.user.update({ where: { id: parseInt(id) }, data }),
    deleteUser: (id) => exports.prisma.user.delete({ where: { id: parseInt(id) } }),
    // Token
    createToken: (data) => exports.prisma.token.create({ data }),
    getToken: (id) => exports.prisma.token.findUnique({ where: { id: parseInt(id) } }),
    getTokens: () => exports.prisma.token.findMany(),
    updateToken: (id, data) => exports.prisma.token.update({ where: { id: parseInt(id) }, data }),
    deleteToken: (id) => exports.prisma.token.delete({ where: { id: parseInt(id) } }),
    // Market
    createMarket: (data) => exports.prisma.market.create({ data }),
    getMarket: (id) => exports.prisma.market.findUnique({ where: { id: parseInt(id) } }),
    getMarkets: () => exports.prisma.market.findMany(),
    updateMarket: (id, data) => exports.prisma.market.update({ where: { id: parseInt(id) }, data }),
    deleteMarket: (id) => exports.prisma.market.delete({ where: { id: parseInt(id) } }),
    // Trade
    createTrade: async (data) => {
        const trade = await exports.prisma.trade.create({ data });
        // Emit chart updates for the token after trade creation
        if (trade.tokenId) {
            try {
                await (0, socket_1.emitChartUpdateForCoin)(trade.tokenId.toString());
            }
            catch (error) {
                console.error("Error emitting chart update after trade creation:", error);
            }
        }
        return trade;
    },
    getTrade: (id) => exports.prisma.trade.findUnique({ where: { id: parseInt(id) } }),
    getTrades: () => exports.prisma.trade.findMany(),
    updateTrade: (id, data) => exports.prisma.trade.update({ where: { id: parseInt(id) }, data }),
    deleteTrade: (id) => exports.prisma.trade.delete({ where: { id: parseInt(id) } }),
    // BondingCurve
    createBondingCurve: (data) => exports.prisma.bondingCurve.create({ data }),
    getBondingCurve: (id) => exports.prisma.bondingCurve.findUnique({ where: { id: parseInt(id) } }),
    getBondingCurves: () => exports.prisma.bondingCurve.findMany(),
    updateBondingCurve: (id, data) => exports.prisma.bondingCurve.update({ where: { id: parseInt(id) }, data }),
    deleteBondingCurve: (id) => exports.prisma.bondingCurve.delete({ where: { id: parseInt(id) } }),
    // LiquidityPool
    createLiquidityPool: (data) => exports.prisma.liquidityPool.create({ data }),
    getLiquidityPool: (id) => exports.prisma.liquidityPool.findUnique({ where: { id: parseInt(id) } }),
    getLiquidityPools: () => exports.prisma.liquidityPool.findMany(),
    updateLiquidityPool: (id, data) => exports.prisma.liquidityPool.update({ where: { id: parseInt(id) }, data }),
    deleteLiquidityPool: (id) => exports.prisma.liquidityPool.delete({ where: { id: parseInt(id) } }),
    // SocialLink
    createSocialLink: (data) => exports.prisma.socialLink.create({ data }),
    getSocialLink: (id) => exports.prisma.socialLink.findUnique({ where: { id: parseInt(id) } }),
    getSocialLinks: () => exports.prisma.socialLink.findMany(),
    updateSocialLink: (id, data) => exports.prisma.socialLink.update({ where: { id: parseInt(id) }, data }),
    deleteSocialLink: (id) => exports.prisma.socialLink.delete({ where: { id: parseInt(id) } }),
    // Session
    createSession: (data) => exports.prisma.session.create({ data }),
    getSession: (id) => exports.prisma.session.findUnique({ where: { id: parseInt(id) } }),
    getSessions: () => exports.prisma.session.findMany(),
    updateSession: (id, data) => exports.prisma.session.update({ where: { id: parseInt(id) }, data }),
    deleteSession: (id) => exports.prisma.session.delete({ where: { id: parseInt(id) } }),
    // Watchlist
    createWatchlist: (data) => exports.prisma.watchlist.create({ data }),
    getWatchlist: (id) => exports.prisma.watchlist.findUnique({ where: { id: parseInt(id) } }),
    getWatchlists: () => exports.prisma.watchlist.findMany(),
    updateWatchlist: (id, data) => exports.prisma.watchlist.update({ where: { id: parseInt(id) }, data }),
    deleteWatchlist: (id) => exports.prisma.watchlist.delete({ where: { id: parseInt(id) } }),
    // LiveStreamChatMessage
    createLiveStreamChatMessage: (data) => exports.prisma.liveStreamChatMessage.create({ data }),
    getLiveStreamChatMessagesByToken: (tokenId) => exports.prisma.liveStreamChatMessage.findMany({
        where: { tokenId: parseInt(tokenId) },
        orderBy: { createdAt: 'asc' },
    }),
    deleteLiveStreamChatMessagesByToken: (tokenId) => exports.prisma.liveStreamChatMessage.deleteMany({
        where: { tokenId: parseInt(tokenId) },
    }),
};
exports.default = prismaService;
