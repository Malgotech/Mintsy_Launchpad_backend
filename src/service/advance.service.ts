import { PrismaClient } from '@prisma/client';
import { getSolPriceUSD } from '../utils/helpers';

export class AdvanceService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createColumn(data: {
        title: string;
        order: number;
        type: string;
        filterable?: boolean;
        defaultFilter?: any;
        availableFilters?: any;
    }): Promise<any> { // Changed AdvanceColumn to any as it's not exported
        return this.prisma.advanceColumn.create({
            data
        });
    }

    async getColumns(userId?: number): Promise<any[]> {
        // Get hidden token IDs for the user
        let hiddenTokenIds: number[] = [];
        if (userId) {
            const hidden = await this.prisma.hiddenCard.findMany({
                where: { userId },
                select: { tokenId: true }
            });
            hiddenTokenIds = hidden.map((h: { tokenId: number }) => h.tokenId);
        }
        const notHidden = hiddenTokenIds.length > 0 ? { notIn: hiddenTokenIds } : undefined;
        // Fetch all tokens for all columns at once for stats
        const allTokens = await this.prisma.token.findMany({
            where: { status: 'ACTIVE', ...(notHidden ? { id: notHidden } : {}) },
        });

        // Fetch SOL price in USD once
        const solPrice = await getSolPriceUSD();
        const now = new Date();
        const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const volumes = await Promise.all(allTokens.map(async (token: any) => {
            const trades = await this.prisma.trade.findMany({
                where: {
                    tokenId: token.id,
                    createdAt: { gte: since },
                },
            });
            const solAmount = trades.reduce((sum: number, t: any) => sum + (Number(t.price) || 0), 0);
            return { tokenId: token.id, volume: solPrice ? solAmount * solPrice : 0 };
        }));
        const volumeMap = Object.fromEntries(volumes.map(v => [v.tokenId, v.volume]));
        // Compute userCountMap and top10Map for all tokens
        const userCounts = await Promise.all(
            allTokens.map(async (token: any) => {
                const count = await this.prisma.userToken.count({
                    where: {
                        tokenId: token.id,
                        tokenAmount: { gt: 0 },
                    },
                });
                return { tokenId: token.id, count };
            })
        );
        const userCountMap = Object.fromEntries(userCounts.map(u => [u.tokenId, u.count]));
        const top10Percents = await Promise.all(
            allTokens.map(async (token: any) => {
                if (!token.supply || token.supply === 0) return { tokenId: token.id, percent: 0 };
                const top10 = await this.prisma.userToken.findMany({
                    where: {
                        tokenId: token.id,
                        tokenAmount: { gt: 0 },
                    },
                    orderBy: { tokenAmount: 'desc' },
                    take: 10,
                });
                const top10Sum = top10.reduce((sum: number, ut: any) => sum + (ut.tokenAmount || 0), 0);
                const percent = Number(((top10Sum / token.supply) * 100).toFixed(2));
                return { tokenId: token.id, percent };
            })
        );
        const top10Map = Object.fromEntries(top10Percents.map(t => [t.tokenId, t.percent]));
        // Now fetch tokens for each column as before
        const [newlyCreated, graduateSoon, featured] = await Promise.all([
            this.prisma.token.findMany({
                where: { status: 'ACTIVE', ...(notHidden ? { id: notHidden } : {}) },
                include :{market:true},
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
            this.prisma.token.findMany({
                where: { status: 'ACTIVE', ...(notHidden ? { id: notHidden } : {}) },
                include :{market:true},

                orderBy: { progress: 'desc' },
                take: 10,
            }),
            this.prisma.token.findMany({
                where: { featured: true, ...(notHidden ? { id: notHidden } : {}) },
                include :{market:true},

                orderBy: { createdAt: 'desc' },
                take: 10,
            })
        ]);
        // console.log(newlyCreated)
        // Attach stats to each token in each column
        function addStats(tokens: any[]) {
            return tokens.map(token => ({
                ...token,
                stats: {
                    users: userCountMap[token.id] || 0,
                    top10: top10Map[token.id] || 0,
                },
                volume: `$${(volumeMap[token.id] || 0).toLocaleString()}`,
                solCollected: token.market && token.market.solCollected != null ? token.market.solCollected : 0,
               
            }));
        }
        const columns = [
            {
                title: 'Newly Created',
                type: 'newly_created',
                cards: addStats(newlyCreated)
            },
            {
                title: 'Graduate Soon',
                type: 'graduate_soon',
                cards: addStats(graduateSoon)
            },
            {
                title: 'Featured',
                type: 'featured',
                cards: addStats(featured)
            }
        ];
        return columns;
    }

    async createCard(data: {
        columnId: string;
        tokenId?: number;
        status?: string;
        riskLevel?: string;
        contractAddress?: string;
    }): Promise<any> { // Changed AdvanceCard to any as it's not exported
        return this.prisma.advanceCard.create({
            data,
            include: {
                token: true,
                column: true
            }
        });
    }

    async updateCard(id: string, data: {
        columnId?: string;
        status?: string;
        riskLevel?: string;
    }): Promise<any> { // Changed AdvanceCard to any as it's not exported
        return this.prisma.advanceCard.update({
            where: { id },
            data,
            include: {
                token: true,
                column: true
            }
        });
    }

    async deleteCard(id: string): Promise<any> { // Changed AdvanceCard to any as it's not exported
        return this.prisma.advanceCard.delete({
            where: { id }
        });
    }

    async getCardsByColumn(columnId: string): Promise<any[]> { // Changed AdvanceCard to any as it's not exported
        return this.prisma.advanceCard.findMany({
            where: {
                columnId
            },
            include: {
                token: true
            }
        });
    }

    async moveCard(cardId: string, newColumnId: string): Promise<any> { // Changed AdvanceCard to any as it's not exported
        return this.prisma.advanceCard.update({
            where: { id: cardId },
            data: {
                columnId: newColumnId
            },
            include: {
                token: true,
                column: true
            }
        });
    }
}