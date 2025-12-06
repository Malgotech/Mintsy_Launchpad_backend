// src/services/prismaService.ts
import { PrismaClient } from '@prisma/client';
import { emitChartUpdateForCoin } from '../utils/socket';

export const prisma = new PrismaClient();

interface PrismaService {
    // User
    createUser: (data: any) => Promise<any>;
    getUser: (id: string) => Promise<any>;
    getUsers: () => Promise<any[]>;
    updateUser: (id: string, data: any) => Promise<any>;
    deleteUser: (id: string) => Promise<any>;

    // Token
    createToken: (data: any) => Promise<any>;
    getToken: (id: string) => Promise<any>;
    getTokens: () => Promise<any[]>;
    updateToken: (id: string, data: any) => Promise<any>;
    deleteToken: (id: string) => Promise<any>;

    // Market
    createMarket: (data: any) => Promise<any>;
    getMarket: (id: string) => Promise<any>;
    getMarkets: () => Promise<any[]>;
    updateMarket: (id: string, data: any) => Promise<any>;
    deleteMarket: (id: string) => Promise<any>;

    // Trade
    createTrade: (data: any) => Promise<any>;
    getTrade: (id: string) => Promise<any>;
    getTrades: () => Promise<any[]>;
    updateTrade: (id: string, data: any) => Promise<any>;
    deleteTrade: (id: string) => Promise<any>;

    // BondingCurve
    createBondingCurve: (data: any) => Promise<any>;
    getBondingCurve: (id: string) => Promise<any>;
    getBondingCurves: () => Promise<any[]>;
    updateBondingCurve: (id: string, data: any) => Promise<any>;
    deleteBondingCurve: (id: string) => Promise<any>;

    // LiquidityPool
    createLiquidityPool: (data: any) => Promise<any>;
    getLiquidityPool: (id: string) => Promise<any>;
    getLiquidityPools: () => Promise<any[]>;
    updateLiquidityPool: (id: string, data: any) => Promise<any>;
    deleteLiquidityPool: (id: string) => Promise<any>;

    // SocialLink
    createSocialLink: (data: any) => Promise<any>;
    getSocialLink: (id: string) => Promise<any>;
    getSocialLinks: () => Promise<any[]>;
    updateSocialLink: (id: string, data: any) => Promise<any>;
    deleteSocialLink: (id: string) => Promise<any>;

    // Session
    createSession: (data: any) => Promise<any>;
    getSession: (id: string) => Promise<any>;
    getSessions: () => Promise<any[]>;
    updateSession: (id: string, data: any) => Promise<any>;
    deleteSession: (id: string) => Promise<any>;

    // Watchlist
    createWatchlist: (data: any) => Promise<any>;
    getWatchlist: (id: string) => Promise<any>;
    getWatchlists: () => Promise<any[]>;
    updateWatchlist: (id: string, data: any) => Promise<any>;
    deleteWatchlist: (id: string) => Promise<any>;

    // LiveStreamChatMessage
    createLiveStreamChatMessage: (data: any) => Promise<any>;
    getLiveStreamChatMessagesByToken: (tokenId: string) => Promise<any[]>;
    deleteLiveStreamChatMessagesByToken: (tokenId: string) => Promise<any>;
}

const prismaService: PrismaService = {
    // User
    createUser: (data) => prisma.user.create({ data }),
    getUser: (id) => prisma.user.findUnique({ where: { id: parseInt(id) } }),
    getUsers: () => prisma.user.findMany(),
    updateUser: (id, data) => prisma.user.update({ where: { id: parseInt(id) }, data }),
    deleteUser: (id) => prisma.user.delete({ where: { id: parseInt(id) } }),

    // Token
    createToken: (data) => prisma.token.create({ data }),
    getToken: (id) => prisma.token.findUnique({ where: { id: parseInt(id) } }),
    getTokens: () => prisma.token.findMany(),
    updateToken: (id, data) => prisma.token.update({ where: { id: parseInt(id) }, data }),
    deleteToken: (id) => prisma.token.delete({ where: { id: parseInt(id) } }),

    // Market
    createMarket: (data) => prisma.market.create({ data }),
    getMarket: (id) => prisma.market.findUnique({ where: { id: parseInt(id) } }),
    getMarkets: () => prisma.market.findMany(),
    updateMarket: (id, data) => prisma.market.update({ where: { id: parseInt(id) }, data }),
    deleteMarket: (id) => prisma.market.delete({ where: { id: parseInt(id) } }),

    // Trade
    createTrade: async (data) => {
        const trade = await prisma.trade.create({ data });
        
        // Emit chart updates for the token after trade creation
        if (trade.tokenId) {
            try {
                await emitChartUpdateForCoin(trade.tokenId.toString());
            } catch (error) {
                console.error("Error emitting chart update after trade creation:", error);
            }
        }
        
        return trade;
    },
    getTrade: (id) => prisma.trade.findUnique({ where: { id: parseInt(id) } }),
    getTrades: () => prisma.trade.findMany(),
    updateTrade: (id, data) => prisma.trade.update({ where: { id: parseInt(id) }, data }),
    deleteTrade: (id) => prisma.trade.delete({ where: { id: parseInt(id) } }),

    // BondingCurve
    createBondingCurve: (data) => prisma.bondingCurve.create({ data }),
    getBondingCurve: (id) => prisma.bondingCurve.findUnique({ where: { id: parseInt(id) } }),
    getBondingCurves: () => prisma.bondingCurve.findMany(),
    updateBondingCurve: (id, data) => prisma.bondingCurve.update({ where: { id: parseInt(id) }, data }),
    deleteBondingCurve: (id) => prisma.bondingCurve.delete({ where: { id: parseInt(id) } }),

    // LiquidityPool
    createLiquidityPool: (data) => prisma.liquidityPool.create({ data }),
    getLiquidityPool: (id) => prisma.liquidityPool.findUnique({ where: { id: parseInt(id) } }),
    getLiquidityPools: () => prisma.liquidityPool.findMany(),
    updateLiquidityPool: (id, data) => prisma.liquidityPool.update({ where: { id: parseInt(id) }, data }),
    deleteLiquidityPool: (id) => prisma.liquidityPool.delete({ where: { id: parseInt(id) } }),

    // SocialLink
    createSocialLink: (data) => prisma.socialLink.create({ data }),
    getSocialLink: (id) => prisma.socialLink.findUnique({ where: { id: parseInt(id) } }),
    getSocialLinks: () => prisma.socialLink.findMany(),
    updateSocialLink: (id, data) => prisma.socialLink.update({ where: { id: parseInt(id) }, data }),
    deleteSocialLink: (id) => prisma.socialLink.delete({ where: { id: parseInt(id) } }),

    // Session
    createSession: (data) => prisma.session.create({ data }),
    getSession: (id) => prisma.session.findUnique({ where: { id: parseInt(id) } }),
    getSessions: () => prisma.session.findMany(),
    updateSession: (id, data) => prisma.session.update({ where: { id: parseInt(id) }, data }),
    deleteSession: (id) => prisma.session.delete({ where: { id: parseInt(id) } }),

    // Watchlist
    createWatchlist: (data) => prisma.watchlist.create({ data }),
    getWatchlist: (id) => prisma.watchlist.findUnique({ where: { id: parseInt(id) } }),
    getWatchlists: () => prisma.watchlist.findMany(),
    updateWatchlist: (id, data) => prisma.watchlist.update({ where: { id: parseInt(id) }, data }),
    deleteWatchlist: (id) => prisma.watchlist.delete({ where: { id: parseInt(id) } }),

    // LiveStreamChatMessage
    createLiveStreamChatMessage: (data) => prisma.liveStreamChatMessage.create({ data }),
    getLiveStreamChatMessagesByToken: (tokenId) => prisma.liveStreamChatMessage.findMany({
        where: { tokenId: parseInt(tokenId) },
        orderBy: { createdAt: 'asc' },
    }),
    deleteLiveStreamChatMessagesByToken: (tokenId) => prisma.liveStreamChatMessage.deleteMany({
        where: { tokenId: parseInt(tokenId) },
    }),
};

export default prismaService;
