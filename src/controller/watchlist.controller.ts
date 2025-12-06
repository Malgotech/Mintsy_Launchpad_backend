import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client"; // adjust relative path accordingly

const prisma = new PrismaClient();

export class WatchlistController {
  // Create a custom watchlist for a user
  createWatchlist = async (req: Request, res: Response) => {
    try {
      const { userId, name } = req.body;
      if (!userId || !name) {
        return res.status(400).json({ success: false, message: "userId and name are required" });
      }
      // Prevent duplicate list names for the same user
      const existing = await prisma.watchlist.findFirst({
        where: { userId, name }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: "Watchlist with this name already exists" });
      }
      const watchlist = await prisma.watchlist.create({
        data: { userId, name },
        include: { tokens: true }
      });
      return res.json({ success: true, watchlist });
    } catch (error) {
      console.error("Error creating watchlist:", error);
      return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  }

  addToWatchlist = async (req: Request, res: Response) => {
    try {
      const { cardId, userId, listId } = req.body;
      let watchlist;
      if (listId) {
        watchlist = await prisma.watchlist.findUnique({
          where: { id: listId },
          include: { tokens: true }
        });
        if (!watchlist) {
          return res.status(404).json({ success: false, message: "Watchlist not found" });
        }
      } else {
        watchlist = await prisma.watchlist.findFirst({
          where: { userId, name: "My Watchlist" },
          include: { tokens: true }
        });
        if (!watchlist) {
          watchlist = await prisma.watchlist.create({
            data: { userId, name: "My Watchlist" },
            include: { tokens: true }
          });
        }
      }
      const tokenId = Number(cardId.replace("nc_", ""));
      const alreadyExists = watchlist.tokens.some(token => token.id === tokenId);
      if (alreadyExists) {
        return res.status(400).json({ success: false, message: "Token already in watchlist" });
      }
      await prisma.watchlist.update({
        where: { id: watchlist.id },
        data: { tokens: { connect: { id: tokenId } } },
      });
      const updatedWatchlist = await prisma.watchlist.findUnique({
        where: { id: watchlist.id },
        include: { tokens: true }
      });
      return res.json({ success: true, message: "Card added to watchlist successfully", watchlist: updatedWatchlist });
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  }

  removeFromWatchlist = async (req: Request, res: Response) => {
    try {
      const { cardId, userId, listId } = req.body;
      let watchlist;
      if (listId) {
        watchlist = await prisma.watchlist.findUnique({
          where: { id: listId },
          include: { tokens: true }
        });
        if (!watchlist) {
          return res.status(404).json({ success: false, message: "Watchlist not found" });
        }
      } else {
        watchlist = await prisma.watchlist.findFirst({
          where: { userId, name: "My Watchlist" },
          include: { tokens: true }
        });
        if (!watchlist) {
          return res.status(404).json({ success: false, message: "Watchlist not found" });
        }
      }
      const tokenId = Number(cardId.replace("nc_", ""));
      const alreadyExists = watchlist.tokens.some(token => token.id === tokenId);
      if (!alreadyExists) {
        return res.status(400).json({ success: false, message: "Token not in watchlist" });
      }
      await prisma.watchlist.update({
        where: { id: watchlist.id },
        data: { tokens: { disconnect: { id: tokenId } } },
      });
      const updatedWatchlist = await prisma.watchlist.findUnique({
        where: { id: watchlist.id },
        include: { tokens: true }
      });
      return res.json({ success: true, message: "Card removed from watchlist successfully", watchlist: updatedWatchlist });
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  }

  getUserLists = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const watchlists = await prisma.watchlist.findMany({
        where: {
          userId: parseInt(userId),
        },
        include: {
          tokens: {
            select: {
              id: true,
              name: true,
              symbol: true,
              imageUrl:true,
              cid:true,
              progress: true,

              // ... other fields you need
              market: true,
            },
          },
          user: true,

        },
      });


      // Get hidden token IDs for the user
      const hidden = await prisma.hiddenCard.findMany({
        where: { userId: parseInt(userId) },
        select: { tokenId: true }
      });
      const hiddenTokenIds = hidden.map(h => h.tokenId);

      // Gather all visible token IDs across all lists
      const allVisibleTokenIds = Array.from(new Set(watchlists.flatMap(list => list.tokens.map(token => token.id)).filter(id => !hiddenTokenIds.includes(id))));


      // Compute userCountMap and top10Map for all tokens in watchlists
      const userCounts = await Promise.all(
        allVisibleTokenIds.map(async (tokenId) => {
          const count = await prisma.userToken.count({
            where: {
              tokenId,
              tokenAmount: { gt: 0 },
            },
          });
          return { tokenId, count };
        })
      );
      const userCountMap = Object.fromEntries(userCounts.map(u => [u.tokenId, u.count]));
      const tokenSupplies = await prisma.token.findMany({
        where: { id: { in: allVisibleTokenIds } },
        select: { id: true, supply: true }
      });
      const supplyMap = Object.fromEntries(tokenSupplies.map(t => [t.id, t.supply]));
      const top10Percents = await Promise.all(
        allVisibleTokenIds.map(async (tokenId) => {
          const supply = supplyMap[tokenId] || 0;
          if (!supply) return { tokenId, percent: 0 };
          const top10 = await prisma.userToken.findMany({
            where: {
              tokenId,
              tokenAmount: { gt: 0 },
            },
            orderBy: { tokenAmount: 'desc' },
            take: 10,
          });
          const top10Sum = top10.reduce((sum, ut) => sum + (ut.tokenAmount || 0), 0);
          const percent = Number(((top10Sum / supply) * 100).toFixed(2));
          return { tokenId, percent };
        })
      );
      const top10Map = Object.fromEntries(top10Percents.map(t => [t.tokenId, t.percent]));

      const formattedLists = watchlists.map((list) => ({
        id: list.id,
        name: list.name,
        type: "default",
        // Filter out hidden tokens and add stats
        tokens: list.tokens.filter(token => !hiddenTokenIds.includes(token.id)).map(token => ({
          ...token,
          stats: {
            users: userCountMap[token.id] || 0,
            top10: top10Map[token.id] || 0,
          }
        })),
        cardCount: list.tokens.filter(token => !hiddenTokenIds.includes(token.id)).length,
        createdAt: list.createdAt.toISOString(),
      }));


      return res.json({
        success: true,
        data: {
          lists: formattedLists,
        },
      });
    } catch (error) {
      console.error("Error getting user lists:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  }
}