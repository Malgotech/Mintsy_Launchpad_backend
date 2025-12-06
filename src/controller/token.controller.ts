import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getIO } from "../utils/socket";
import prismaService from "../service/prismaService";
import { getSolPriceUSD } from "../utils/helpers";
import { emitChartUpdateOnPriceChange } from "../utils/socket";
import axios from "axios";

const prisma = new PrismaClient();

export class TokenController {
  // Create a new token
  createToken = async (req: Request, res: Response) => {
    try {
      const {
        mintAccount,
        symbol,
        name,
        description,
        imageUrl,
        cid,
        decimals = 9,
        user_account,
        tags, // Array of tag labels (strings),
        socials,
      } = req.body;

      console.log("Received tags:", tags); // Debug log

      if (!user_account) return res.status(401).json({ error: "Unauthorized" });

      // Process optional social links
      let socialLinkData: any[] = [];
      if (Array.isArray(socials)) {
        socialLinkData = socials
          .filter((s) => s?.url && s?.type)
          .map((s) => ({
            url: s.url,
            type: s.type.toUpperCase(), // Ensure enum consistency
          }));
      }

      // Process tags if provided
      let tagConnections: any[] = [];
      if (tags && Array.isArray(tags)) {
        console.log("Processing tags array:", tags); // Debug log
        for (const tagLabel of tags) {
          if (typeof tagLabel === "string") {
            // Create or connect tag by label
            const tagId = tagLabel.toLowerCase().replace(/\s+/g, "-");
            console.log("Processing tag:", tagLabel, "-> ID:", tagId); // Debug log

            await prisma.tag.upsert({
              where: { id: tagId },
              update: {
                count: { increment: 1 },
              },
              create: {
                id: tagId,
                label: tagLabel,
                active: true,
                count: 1,
              },
            });
            tagConnections.push({ id: tagId });
            console.log("Added tag connection:", { id: tagId }); // Debug log
          }
        }
      }

      console.log("Final tag connections:", tagConnections); // Debug log

      const token = await prisma.token.create({
        data: {
          ...(mintAccount && { mintAccount }),
          symbol,
          name,
          description,
          imageUrl,
          cid,
          decimals,
          creatorAccount: user_account,
          market: {
            create: {
              currentPrice: 0,
              priceChange: 0,
              marketCap: 0,
              ratio: 0,
              priceChange24h: 0,
              volume24h: 0,
              liquidity: 0,
              solCollected: 0,
            },
          },

          status: "PENDING",
          // Connect tags if any were processed
          tags: {
            connectOrCreate: tagConnections.map((tag) => ({
              where: { id: tag.id },
              create: {
                id: tag.id,
                label: tag.label || tag.id,
                active: true,
                count: 1,
              },
            })),
          },
          // Social links
          ...(socialLinkData.length > 0 && {
            socials: {
              create: socialLinkData,
            },
          }),
        },
      });

      console.log("Token created with ID:", token.id); // Debug log

      // Fetch the created token with relations for the event payload
      const fullToken = await prisma.token.findUnique({
        where: { id: token.id },
        include: {
          creator: true,
          market: true,
          socials: true,
          tags: true, // Include tags in the response
        },
      });

      console.log("Full token with tags:", fullToken?.tags); // Debug log

      if (fullToken) {
        const username =
          fullToken.creator?.name || fullToken.creator?.userAccount || "";
        const tokenName = fullToken.name;
        const userId = fullToken.creator?.id || "";
        const contractAddress = fullToken.mintAccount || "";
        getIO().emit("coin-created", {
          channel: "new-coins",
          data: { username, tokenName, userId, contractAddress },
        });

        // Calculate user count (users holding this token)
        const users = await prisma.userToken.count({
          where: {
            tokenId: fullToken.id,
            tokenAmount: { gt: 0 },
          },
        });
        // Calculate top10 percentage
        const tokenSupply = fullToken.supply || 0;
        let top10 = 0;
        if (tokenSupply > 0) {
          const top10Holders = await prisma.userToken.findMany({
            where: {
              tokenId: fullToken.id,
              tokenAmount: { gt: 0 },
            },
            orderBy: { tokenAmount: "desc" },
            take: 10,
          });
          const top10Sum = top10Holders.reduce(
            (sum: number, ut: any) => sum + (ut.tokenAmount || 0),
            0
          );
          top10 = Number(((top10Sum / tokenSupply) * 100).toFixed(2));
        }

        getIO().emit("token-created", {
          channel: "new-token",
          data: { fullToken, stats: { users, top10 } },
        });
      }

      return res.status(201).json(fullToken || token);
    } catch (err) {
      console.error("Token create error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };

  // Get all tokens
  getTokens = async (req: Request, res: Response) => {
    try {
      const { tags } = req.query;

      let whereClause: any = {};

      // Filter by tags if provided
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        whereClause.tags = {
          some: {
            id: {
              in: tagArray.map((tag: any) =>
                String(tag).toLowerCase().replace(/\s+/g, "-")
              ),
            },
          },
        };
      }

      const tokens = await prisma.token.findMany({
        where: whereClause,
        include: {
          creator: true,
          market: true,
          socials: true,
          tags: true, // Include tags
        },
      });
      // Fetch SOL price in USD once
      const solPrice = await getSolPriceUSD();
      const now = new Date();
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const volumes = await Promise.all(
        tokens.map(async (token: any) => {
          const trades = await prisma.trade.findMany({
            where: {
              tokenId: token.id,
              createdAt: { gte: since },
            },
          });
          const solAmount = trades.reduce(
            (sum: number, t: any) => sum + (Number(t.price) || 0),
            0
          );
          return {
            tokenId: token.id,
            volume: solPrice ? solAmount * solPrice : 0,
          };
        })
      );
      const volumeMap = Object.fromEntries(
        volumes.map((v) => [v.tokenId, v.volume])
      );
      // Attach volume to each token
      const tokensWithVolume = tokens.map((token: any) => ({
        ...token,
        volume: `$${(volumeMap[token.id] || 0).toLocaleString()}`,
      }));
      return res.json(tokensWithVolume);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";

      return res.status(500).json({ error: errorMessage });
    }
  };

  // Get token by ID
  // getTokenById = async (req: Request, res: Response) => {
  //   try {
  //     const { id } = req.params;
  //     const token = await prisma.token.findUnique({
  //       where: { id: Number(id) },
  //       include: {
  //         creator: true,
  //         market: true,
  //         bondingCurve: true,
  //         liquidityPool: true,
  //         socials: true,
  //       },
  //     });

  //     if (!token) {
  //       return res.status(404).json({ error: "Token not found" });
  //     }

  //     return res.json(token);
  //   } catch (error) {
  //     const errorMessage =
  //       error instanceof Error ? error.message : "An unknown error occurred";

  //     return res.status(500).json({ error: errorMessage });
  //   }
  // }

  /// new type

  getTokenById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const token = await prisma.token.findUnique({
        where: { mintAccount: id },
        include: {
          creator: true,
          market: true,
          bondingCurve: true,
          liquidityPool: true,
          socials: true,
          tags: true, // Include tags
        },
      });

      // Increment the viewCount
      const nowForView = new Date();
      const midnight = new Date(nowForView);
      midnight.setHours(0, 0, 0, 0);

      await prisma.token.update({
        where: { mintAccount: id },
        data: {
          viewCount: { increment: 1 },

          lastViewReset: midnight,
        },
      });

      if (token?.lastViewReset && token.lastViewReset < midnight) {
        await prisma.token.update({
          where: { mintAccount: id },
          data: {
            viewCount: 1,
            lastViewReset: midnight,
          },
        });
      }

      if (!token) {
        return res.status(404).json({
          success: false,
          error: "Coin not found",
        });
      }

      // Fetch SOL price in USD
      const solPrice = await getSolPriceUSD();
      const now = new Date();
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const trades = await prisma.trade.findMany({
        where: {
          tokenId: token.id,
          createdAt: { gte: since },
        },
      });
      const solAmount = trades.reduce(
        (sum: number, t: any) => sum + (Number(t.price) || 0),
        0
      );
      const volume = solPrice ? solAmount * solPrice : 0;

      // Fetch threads for this coin
      const threads = await prisma.thread.findMany({
        where: { coin_id: token.symbol },
        orderBy: { created_at: "desc" },
        include: {
          replies: {
            orderBy: { created_at: "asc" },
          },
        },
      });

      const discussions = threads.map((thread: any) => ({
        id: thread.id,
        coinId: thread.coin_id,
        userId: thread.user_id,
        username: thread.username,
        message: thread.message,
        imageUrl: thread.image_url,
        likes: thread.likes,
        createdAt: thread.created_at,
        replies: thread.replies.map((reply: any) => ({
          id: reply.id,
          threadId: reply.thread_id,
          userId: reply.user_id,
          username: reply.username,
          message: reply.message,
          imageUrl: reply.image_url,
          likes: reply.likes,
          createdAt: reply.created_at,
        })),
      }));

      const coinDetails = {
        id: token.id,
        name: token.name,
        symbol: token.symbol,
        imageSrc: token.cid,
        mintAccount: token.mintAccount,
        isLive: token.isLive,
        altText: `${token.name} logo`,
        createdAt: token.createdAt,
        finalMarketCap: Number(token.finalMarketCap),
        creator: {
          id: token.creator.id,
          name: token.creator.name,
          verified: token.creator.isVerified,
          address: token.creator.userAccount,
        },
        liquidityPool: token.liquidityPool
          ? {
              id: token.liquidityPool.id,
              baseAsset: token.liquidityPool.baseAsset,
              liquidityPercentage: token.liquidityPool.liquidityPercentage,
              poolAddress: token.liquidityPool.poolAddress,
            }
          : null,
        progress: token.progress,
        description: token.description,
        discussions: {
          threads: discussions,
        },
        volume: `$${(volume || 0).toLocaleString()}`,
        market: token.market
          ? {
              id: token.market.id,
              tokenId: token.market.tokenId,
              currentPrice: token.market.currentPrice,
              priceChange: token.market.priceChange,
              marketCap: token.market.marketCap,
              ratio: token.market.ratio,
              priceChange24h: token.market.priceChange24h,
              volume24h: token.market.volume24h,
              liquidity: token.market.liquidity,
              solCollected: token.market.solCollected,
              createdAt: token.market.createdAt,
              updatedAt: token.market.updatedAt,
            }
          : null,
        socials:
          token.socials?.reduce((acc: any, curr) => {
            acc[curr.type.toLowerCase()] = curr.url;
            return acc;
          }, {}) || {},
      };

      return res.json({
        success: true,
        data: coinDetails,
      });
    } catch (error) {
      console.error("Error getting coin details:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };

  getAllTokensByFilter = async (req: Request, res: Response) => {
    try {
      const {
        featured,
        lastTrade,
        currentlyLive,
        creationTime,
        sortBy,
        order,
      } = req.query;

      let whereClause: any = {};
      let orderBy: any = {};

      if (featured === "true") {
        whereClause.isFeatured = true;
      }

      if (currentlyLive === "true") {
        whereClause.status = "ACTIVE";
      }

      if (lastTrade) {
        whereClause.lastTradeAt = {
          gte: new Date(
            Date.now() - parseInt(lastTrade as string) * 24 * 60 * 60 * 1000
          ),
        };
      }

      if (creationTime) {
        whereClause.createdAt = {
          gte: new Date(
            Date.now() - parseInt(creationTime as string) * 24 * 60 * 60 * 1000
          ),
        };
      }

      if (sortBy) {
        orderBy[sortBy as string] = order === "desc" ? "desc" : "asc";
      }

      const tokens = await prisma.token.findMany({
        where: whereClause,
        orderBy,
        include: {
          creator: true,
          market: true,
          socials: true,
        },
      });
      // Fetch SOL price in USD once
      const solPrice = await getSolPriceUSD();
      const now = new Date();
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const volumes = await Promise.all(
        tokens.map(async (token: any) => {
          const trades = await prisma.trade.findMany({
            where: {
              tokenId: token.id,
              createdAt: { gte: since },
            },
          });
          const solAmount = trades.reduce(
            (sum: number, t: any) => sum + (Number(t.price) || 0),
            0
          );
          return {
            tokenId: token.id,
            volume: solPrice ? solAmount * solPrice : 0,
          };
        })
      );
      const volumeMap = Object.fromEntries(
        volumes.map((v) => [v.tokenId, v.volume])
      );
      // Attach volume to each token
      const tokensWithVolume = tokens.map((token: any) => ({
        ...token,
        volume: `$${(volumeMap[token.id] || 0).toLocaleString()}`,
      }));
      return res.json(tokensWithVolume);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({ error: errorMessage });
    }
  };

  updateToken = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name,
        progress,
        userCount,
        durationInDays,
        apy,
        marketCap,
        currentPrice,
        volume24h,
        liquidityPercentage,
        priceChange24h,
        commentCount,
        status,
        nsfw,
        network,

        creator,
        isLive,
        mintAccount,
      } = req.body;

      const token = await prisma.token.update({
        where: { id: Number(id) },
        data: {
          name,
          progress,
          userCount,
          durationInDays,
          apy,
          status,
          nsfw,
          network,
          isLive,
          mintAccount,
          // Update creator information
          creator: {
            update: {
              name: creator?.name,
              isVerified: creator?.verified,
            },
          },

          market: {
            upsert: {
              create: {
                marketCap,
                currentPrice,
                volume24h,
                priceChange24h,
              },
              update: {
                marketCap,
                currentPrice,
                volume24h,
                priceChange24h,
              },
            },
          },
          liquidityPool: {
            upsert: {
              create: {
                baseAsset: "SOL",
                liquidityPercentage,
              },
              update: { liquidityPercentage },
            },
          },
          socials: {
            upsert: {
              where: {
                id: Number(id),
              },
              create: {
                commentCount,
                url: "", // provide a default or actual URL
                type: "WEBSITE", // provide a default or actual type
              },
              update: { commentCount },
            },
          },
        },
        include: {
          creator: true,
          market: true,
          // liquidityPool: true,
          // socials: true,
          // tags: true,
        },
      });

      // If isLive is explicitly set to false, delete all live stream chat messages for this token
      if (isLive === false) {
        await prismaService.deleteLiveStreamChatMessagesByToken(id);
      }

      // Emit chart updates when token data changes
      try {
        await emitChartUpdateOnPriceChange(Number(id));
      } catch (error) {
        console.error("Error emitting chart update on token change:", error);
      }

      // Emit websocket event for token update
      getIO().emit("token-update", { token: token, market: token.market });

      return res.json({
        success: true,
        data: token,
      });
    } catch (error) {
      console.error("Error in updateToken:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };

  updateTokenProgress = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { progress } = req.body;
      console.log(
        typeof progress !== "number" || progress < 0 || progress > 100
      );

      if (progress < 0 || progress > 100) {
        return res.status(400).json({
          success: false,
          error: "Progress must be a number between 0 and 100",
        });
      }

      const token = await prisma.token.update({
        where: { id: Number(id) },
        data: { progress: Number(progress) },
        include: {
          creator: true,
          market: true,
          // liquidityPool: true,
          // socials: true,
          // tags: true,
        },
      });

      getIO().emit("token-progress-update", { token });

      return res.json({
        success: true,
        data: token,
      });
    } catch (error) {
      console.error("Error in updateTokenProgress:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };

  getSimilarCoins = async (req: Request, res: Response) => {
    try {
      const { limit = 10 } = req.query;
      const { description } = req.body;

      if (!description || typeof description !== "string") {
        return res.status(400).json({
          success: false,
          error: "Description is required in the request body",
        });
      }

      // Normalize and extract meaningful words
      const searchWords = description
        .toLowerCase()
        .split(/\s+/)
        .filter(
          (word) =>
            word.length > 3 && !["the", "and", "for", "with"].includes(word)
        );

      const searchWordSet = new Set(searchWords);

      if (searchWordSet.size === 0) {
        return res.status(400).json({
          success: false,
          error: "Description must contain at least two meaningful words",
        });
      }

      // Get all tokens with non-null description and ACTIVE status
      const tokens = await prisma.token.findMany({
        where: {
          status: "ACTIVE",
          description: {
            not: null,
          },
        },
        include: {
          market: true,
          liquidityPool: true,
        },
      });

      // Score tokens by number of matching words
      const scoredTokens = tokens.map((token) => {
        const tokenWords = new Set(
          (token.description || "")
            .toLowerCase()
            .split(/\s+/)
            .filter((word) => word.length > 3)
        );

        const matchCount = [...searchWordSet].filter((word) =>
          tokenWords.has(word)
        ).length;

        return {
          ...token,
          matchScore: matchCount,
        };
      });

      // Only return tokens with at least 2 matching words
      const similarCoins = scoredTokens
        .filter((token) => token.matchScore >= 2)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, Number(limit));

      // If no tokens matched strictly, return empty array
      return res.json({
        success: true,
        data: {
          similarCoins,
        },
      });
    } catch (error) {
      console.error("Error getting similar coins:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };

  getCoinDetails = async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      console.log("symbol", symbol);

      const token = await prisma.token.findUnique({
        where: { symbol: symbol },
        include: {
          creator: true,
          market: true,
          // socials: true,
          // tags: true,
        },
      });

      if (!token) {
        return res.status(404).json({
          success: false,
          error: "Coin not found",
        });
      }

      // Fetch SOL price in USD
      const solPrice = await getSolPriceUSD();
      const now = new Date();
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const trades = await prisma.trade.findMany({
        where: {
          tokenId: token.id,
          createdAt: { gte: since },
        },
      });
      const solAmount = trades.reduce(
        (sum: number, t: any) => sum + (Number(t.price) || 0),
        0
      );
      const volume = solPrice ? solAmount * solPrice : 0;

      // Fetch threads for this coin
      const threads = await prisma.thread.findMany({
        where: { coin_id: token.symbol },
        orderBy: { created_at: "desc" },
        include: {
          replies: {
            orderBy: { created_at: "asc" },
          },
        },
      });

      const discussions = threads.map((thread: any) => ({
        id: thread.id,
        coinId: thread.coin_id,
        userId: thread.user_id,
        username: thread.username,
        message: thread.message,
        imageUrl: thread.image_url,
        likes: thread.likes,
        createdAt: thread.created_at,
        replies: thread.replies.map((reply: any) => ({
          id: reply.id,
          threadId: reply.thread_id,
          userId: reply.user_id,
          username: reply.username,
          message: reply.message,
          imageUrl: reply.image_url,
          likes: reply.likes,
          createdAt: reply.created_at,
        })),
      }));

      const coinDetails = {
        id: token.id,
        name: token.name,
        symbol: token.symbol,
        imageSrc: token.cid,
        mintAccount: token.mintAccount,
        isLive: token.isLive,
        altText: `${token.name} logo`,
        createdAt: token.createdAt,
        finalMarketCap: Number(token.finalMarketCap) * Number(solPrice),
        progress: token.progress,
        creator: {
          id: token.creator.id,
          name: token.creator.name,
          verified: token.creator.isVerified,
          address: token.creator.userAccount,
        },
        description: token.description,
        discussions: {
          threads: discussions,
        },
        market: token.market,
        volume: `$${(volume || 0).toLocaleString()}`,
      };

      return res.json({
        success: true,
        data: coinDetails,
      });
    } catch (error) {
      console.error("Error getting coin details:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };

  updateLpStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { lpPool } = req.body;

      if (!lpPool) {
        return res.status(400).json({
          success: false,
          error: "LP pool address is required",
        });
      }

      const token = await prisma.token.update({
        where: { mintAccount: id },
        data: {
          liquidityPool: {
            upsert: {
              create: {
                baseAsset: "SOL",
                liquidityPercentage: 0,
                poolAddress: lpPool,
              },
              update: {
                liquidityPercentage: 0,
                poolAddress: lpPool,
              },
            },
          },
        },
      });

      return res.json({
        success: true,
        data: token,
        message: "LP pool address updated successfully",
      });
    } catch (error) {
      console.error("Error updating LP pool address:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };

  getTokenHolders = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const trades = await prisma.trade.findMany({
        where: {
          tokenId: Number(id),
        },
        include: {
          user: true,
        },
      });

      const holders = trades.reduce((acc: any, trade: any) => {
        if (!acc[trade.userId]) {
          acc[trade.userId] = {
            ...trade.user,
            amount: 0,
          };
        }
        if (trade.side === "BUY") {
          acc[trade.userId].amount += trade.amount;
        } else {
          acc[trade.userId].amount -= trade.amount;
        }
        return acc;
      }, {});

      const holderList = Object.values(holders).filter(
        (holder: any) => holder.amount > 0
      );

      return res.json({
        success: true,
        data: holderList,
      });
    } catch (error) {
      console.error("Error getting token holders:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };

  getTopHoldersByCoinId = async (req: Request, res: Response) => {
    try {
      const { coinId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const token = await prisma.token.findUnique({
        where: { id: parseInt(coinId) },
        include: {
          userTokens: {
            include: {
              user: true,
            },
            orderBy: {
              tokenAmount: "desc",
            },
            take: limit,
          },
        },
      });

      if (!token) {
        return res.status(404).json({ error: "Token not found" });
      }

      const topHolders = token.userTokens.map((userToken: any) => ({
        // userAccount: userToken.user.userAccount,
        id: userToken.user.id,
        name: userToken.user.name,
        // avatarUrl: userToken.user.avatarUrl,
        // balance: userToken.tokenAmount,
        percentage: (userToken.tokenAmount / token.supply) * 100,
      }));

      return res.json({
        success: true,
        data: topHolders,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({ error: errorMessage });
    }
  };

  // Get live tokens
  getLiveTokens = async (req: Request, res: Response) => {
    try {
      const liveTokens = await prisma.token.findMany({
        where: {
          isLive: true,
        },
        include: {
          creator: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      // Fetch SOL price in USD once
      const solPrice = await getSolPriceUSD();
      const now = new Date();
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const volumes = await Promise.all(
        liveTokens.map(async (token: any) => {
          const trades = await prisma.trade.findMany({
            where: {
              tokenId: token.id,
              createdAt: { gte: since },
            },
          });
          const solAmount = trades.reduce(
            (sum: number, t: any) => sum + (Number(t.price) || 0),
            0
          );
          return {
            tokenId: token.id,
            volume: solPrice ? solAmount * solPrice : 0,
          };
        })
      );
      const volumeMap = Object.fromEntries(
        volumes.map((v) => [v.tokenId, v.volume])
      );
      // Attach volume to each token
      const tokensWithVolume = liveTokens.map((token: any) => ({
        ...token,
        volume: `$${(volumeMap[token.id] || 0).toLocaleString()}`,
      }));
      return res.json({
        success: true,
        data: tokensWithVolume,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({ error: errorMessage });
    }
  };

  // Get tokens by tag
  getTokensByTag = async (req: Request, res: Response) => {
    try {
      const { tagId } = req.params;
      const { limit = 20, offset = 0 } = req.query;
      const tokens = await prisma.token.findMany({
        where: {
          tags: {
            some: {
              id: tagId,
            },
          },
        },
        include: {
          creator: true,
          market: true,
          socials: true,
          tags: true,
        },
        take: Number(limit),
        skip: Number(offset),
        orderBy: {
          createdAt: "desc",
        },
      });
      // Fetch SOL price in USD once
      const solPrice = await getSolPriceUSD();
      const now = new Date();
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const volumes = await Promise.all(
        tokens.map(async (token: any) => {
          const trades = await prisma.trade.findMany({
            where: {
              tokenId: token.id,
              createdAt: { gte: since },
            },
          });
          const solAmount = trades.reduce(
            (sum: number, t: any) => sum + (Number(t.price) || 0),
            0
          );
          return {
            tokenId: token.id,
            volume: solPrice ? solAmount * solPrice : 0,
          };
        })
      );
      const volumeMap = Object.fromEntries(
        volumes.map((v) => [v.tokenId, v.volume])
      );
      // Attach volume to each token
      const tokensWithVolume = tokens.map((token: any) => ({
        ...token,
        volume: `$${(volumeMap[token.id] || 0).toLocaleString()}`,
      }));
      return res.json({
        success: true,
        data: tokensWithVolume,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: tokens.length,
        },
      });
    } catch (error) {
      console.error("Error getting tokens by tag:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };
  updateGraduationStatus = async (req: Request, res: Response) => {
    try {
      const { mintAccount } = req.body;

      if (!mintAccount) {
        return res.status(400).json({ error: "MintAccount is required" });
      }

      // Check if token exists
      const token = await prisma.token.findUnique({
        where: { mintAccount },
      });

      if (!token) {
        return res.status(404).json({ error: "Token not found" });
      }

      // Update token
      const updated = await prisma.token.update({
        where: { mintAccount: mintAccount },
        data: {
          graduationStatus: "SUCCESS",
          graduatedAt: new Date(),
        },
      });

      try {
        const response = await axios.post(
          "http://localhost:4000/addGraduatedToken",
          {
            id: updated.mintAccount,
            name: updated.name,
            symbol: updated.symbol,
            decimals: updated.decimals,
            icon: `https://ipfs.io/ipfs/${updated.cid}`,

            totalSupply: updated.supply,
            dollarPrice: updated.lastPrice,
            graduatedAt: updated.graduatedAt,
            coinId: updated.id,
          }
        );
        console.log("Axios response:", response.data);

        console.log("updated", updated.id);
        const trades = await prisma.trade.findMany({
          where: {
            tokenId: Number(updated.id),
            side: { in: ["BUY", "SELL"] },
          },
        });

        console.log("Trades to send:", trades);

        if (trades.length > 0) {
          try {
            const response = await axios.post(
              "http://localhost:4000/addTrade",
              trades, // send the array directly
              { headers: { "Content-Type": "application/json" } }
            );

            console.log("Add trade response data:", response.data.data);
          } catch (axiosError: any) {
            console.error(
              "Error calling addGraduatedTrade API:",
              axiosError.response?.data || axiosError.message
            );
          }
        } else {
          console.log("No trades found to send to addTrade API.");
        }
      } catch (axiosError: any) {
        console.error(
          "Error calling addGraduatedToken API:",
          axiosError.message
        );
      }

      return res.json({
        success: true,
        message: "Graduation status updated",
        data: updated,
      });
    } catch (err) {
      console.error("Error updating graduation status:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}
