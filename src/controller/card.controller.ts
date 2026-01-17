import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getSolPriceUSD, getTimeAgo } from "../utils/helpers";
import { create } from "domain";
const prisma = new PrismaClient();

export class CardController {
  // Get Alpha Spot Cards
  getAlphaSpot = async (req: Request, res: Response) => {
    try {
      const {
        sort = "graduatingsoon",
        limit = 10,
        offset = 0,
        filter,
      } = req.query;

      // Normalize sort value
      const sortValue =
        typeof sort === "string" ? sort.toLowerCase() : "graduatingsoon";

      let whereClause: any = {
        status: "ACTIVE",
        // progress: {
        //   gt: 30,
        // },
        graduationStatus: "PENDING",
      };
      let orderBy: any = {};

      // Handle sorting and filtering
      switch (sortValue) {
        case "graduatingsoon":
          orderBy.progress = "desc";
          break;
        case "popular":
          orderBy.finalMarketCap = "desc";
          break;
        case "price":
          orderBy.lastPrice = "desc";
          break;
        default:
          // Default to graduatingsoon logic
          whereClause.graduationStatus = "ACTIVE";
          orderBy.finalMarketCap = "desc";
          break;
      }

      // Handle filter percentage (if any)

      // Get total count for pagination
      const totalCount = await prisma.token.count({ where: whereClause });

      // Get tokens
      const tokens = await prisma.token.findMany({
        where: whereClause,
        orderBy,
        take: Number(limit),
        skip: Number(offset),
        include: {
          market: true,
          creator: true,

          // liquidityPool: true, // Temporarily commented out due to missing poolAddress column
        },
      });
      if (sortValue === "graduatingsoon") {
        // Sort by progress if graduatingsoon
        tokens.sort((a, b) => (b.progress || 0) - (a.progress || 0));
      }
      if (sortValue === "popular") {
        // Sort by finalMarketCap if popular
        tokens.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      }
      if (sortValue === "price") {
        // Sort by lastPrice if price
        tokens.sort((a, b) => (b.lastPrice || 0) - (a.lastPrice || 0));
      }

      // Fetch SOL price in USD once
      const livePriceDB = await prisma.liveSolPrice.findUnique({
        where: { symbol: "SOL" },
      });
      const livePrice = await getSolPriceUSD();
      const solPrice = livePriceDB?.price || livePrice;

      // For each token, calculate 24h volume in USD
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

      // For each token, count users holding it (tokenAmount > 0)
      const userCounts = await Promise.all(
        tokens.map(async (token: any) => {
          const count = await prisma.userToken.count({
            where: {
              tokenId: token.id,
              tokenAmount: { gt: 0 },
            },
          });
          return { tokenId: token.id, count };
        })
      );
      const userCountMap = Object.fromEntries(
        userCounts.map((u) => [u.tokenId, u.count])
      );

      // For each token, calculate top10 percentage
      const top10Percents = await Promise.all(
        tokens.map(async (token: any) => {
          if (!token.supply || token.supply === 0)
            return { tokenId: token.id, percent: 0 };
          const top10 = await prisma.userToken.findMany({
            where: {
              tokenId: token.id,
              tokenAmount: { gt: 0 },
            },
            orderBy: { tokenAmount: "desc" },
            take: 10,
          });
          const top10Sum = top10.reduce(
            (sum: number, ut: any) => sum + (ut.tokenAmount || 0),
            0
          );
          const percent = Number(((top10Sum / token.supply) * 100).toFixed(2));
          return { tokenId: token.id, percent };
        })
      );
      const top10Map = Object.fromEntries(
        top10Percents.map((t) => [t.tokenId, t.percent])
      );

      // Calculate threadCount for each token
      const threadCounts = await Promise.all(
        tokens.map(async (token: any) => {
          // Threads for this token (by symbol)
          const threads = await prisma.thread.findMany({
            where: { coin_id: token.id.toString() },
            select: { id: true },
          });
          const threadIds = threads.map((t) => t.id);
          const threadCount = threads.length;
          let replyCount = 0;
          if (threadIds.length > 0) {
            replyCount = await prisma.reply.count({
              where: { thread_id: { in: threadIds } },
            });
          }
          return { tokenId: token.id, threadCount: threadCount + replyCount };
        })
      );
      const threadCountMap = Object.fromEntries(
        threadCounts.map((tc) => [tc.tokenId, tc.threadCount])
      );
      // console.log(threadCountMap[1])

      const cards = tokens.map((token: any) => ({
        id: `${token.id}`,
        name: token.name,
        symbol: token.symbol,
        imageSrc: token.imageUrl,
        description: token.description,
        cid: token.cid,
        solCollected: token?.market?.solCollected || 0,
        lastPrice: token.lastPrice || 0,
        //@ts-ignore
        replies:
          token.socials?.reduce(
            (acc: number, s: any) => acc + (s.commentCount || 0),
            0
          ) || 0,
        threadCount: threadCountMap[token.id] || 0,
        altText: `${token.name} Coin`,
        progress: token.progress || 0,
        stats: {
          users: userCountMap[token.id] || 0,
          top10: top10Map[token.id] || 0,
        },
        creator: token.creator
          ? {
              name: token.creator.name,
              avatar: token.creator.avatarUrl || "",
              userAddress: token.creator.userAccount || "",
            }
          : null,
        metrics: {
          marketCap: `$${(token?.finalMarketCap || 0).toLocaleString()}`,
          price: token.lastPrice,
          volume: `$${(volumeMap[token.id] || 0).toLocaleString()}`,
          liquidity: `0%`, // Temporarily set to 0% due to missing liquidityPool relation
        },
        createdAt: token.createdAt,
        createdAtDisplay: `Created ${getTimeAgo(token.createdAt)}`,
        change: token.market?.priceChange24h
          ? `${token.market.priceChange24h > 0 ? "+" : ""}${
              token.market.priceChange24h
            }`
          : "+0.00",
        contractAddress: token.mintAccount,
        network: "solana",
      }));

      return res.json({
        success: true,
        data: {
          cards,
          pagination: {
            total: totalCount,
            limit: Number(limit),
            offset: Number(offset),
            hasMore: totalCount > Number(offset) + Number(limit),
          },
        },
      });
    } catch (error) {
      console.error("Error in getAlphaSpot:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };

  getTrendingCards = async (req: Request, res: Response) => {
    try {
      const { limit = 30 } = req.query;

      const tokens = await prisma.token.findMany({
        where: {
          status: "ACTIVE",
          graduationStatus: "SUCCESS",
        },

        orderBy: {
          createdAt: "desc",
        },
        take: Number(limit),
        include: {
          market: true,
          socials: true,
          creator: true,
          tags: true,
        },
      });

      // Fetch SOL price in USD once
      const livePriceDB = await prisma.liveSolPrice.findUnique({
        where: { symbol: "SOL" },
      });
      const livePrice = await getSolPriceUSD();
      const solPrice = livePriceDB?.price || livePrice;
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

      // Calculate threadCount for each token
      const threadCounts = await Promise.all(
        tokens.map(async (token: any) => {
          // Threads for this token (by symbol)
          const threads = await prisma.thread.findMany({
            where: { coin_id: token.id.toString() },
            select: { id: true },
          });
          const threadIds = threads.map((t) => t.id);
          const threadCount = threads.length;
          let replyCount = 0;
          if (threadIds.length > 0) {
            replyCount = await prisma.reply.count({
              where: { thread_id: { in: threadIds } },
            });
          }
          return { tokenId: token.id, threadCount: threadCount + replyCount };
        })
      );
      const threadCountMap = Object.fromEntries(
        threadCounts.map((tc) => [tc.tokenId, tc.threadCount])
      );
      // console.log(threadCountMap[1])

      const userCounts = await Promise.all(
        tokens.map(async (token: any) => {
          const count = await prisma.userToken.count({
            where: {
              tokenId: token.id,
              tokenAmount: { gt: 0 },
            },
          });
          return { tokenId: token.id, count };
        })
      );

      const userCountMap = Object.fromEntries(
        userCounts.map((u) => [u.tokenId, u.count])
      );

      const cards = tokens.map((token: any) => ({
        id: `${token.id}`,
        cid: token.cid,
        altText: token.name,
        symbol: token.symbol,
        name: token.name.toUpperCase(),
        description: token.description,
        readMoreLink: `/coins/${token.symbol.toLowerCase()}`,
        progress: token.progress,
        marketCap: token.finalMarketCap || 0,

        replies:
          token.socials?.reduce(
            (acc: number, s: any) => acc + (s.commentCount || 0),
            0
          ) || 0,
        network: token.network || "solana",
        threadCount: threadCountMap[token.id.toString()] || 0,
        contractAddress: token.mintAccount,
        volume: `$${(volumeMap[token.id] || 0).toLocaleString()}`,
        creator: token.creator
          ? {
              name: token.creator.name,
              avatar: token.creator.avatarUrl || "",
              userAddress: token.creator.userAccount || "",
            }
          : null,
        tags: token.tags,
        createdAt: token.createdAt,
        timeAgo: getTimeAgo(token.createdAt),
        stats: {
          users: userCountMap[token.id] || 0,
          // top10: top10Map[token.id] || 0,
        },
      }));

      return res.json({
        success: true,
        data: {
          cards,
        },
      });
    } catch (error) {
      console.error("Error in getTrendingCards:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };

  getFeaturedCards = async (req: Request, res: Response) => {
    try {
      const { filter, tags, nsfw = false } = req.query;

      let whereClause: any = {
        featured: true,
      };

      if (tags) {
        whereClause.tags = {
          some: {
            id: {
              in: (tags as string).split(","),
            },
          },
        };
      }

      if (nsfw === "false") {
        whereClause.nsfw = false;
      }

      let orderBy: any = {};

      // Handle different filter options
      switch (filter) {
        case "Featured":
          // Default featured order - keep as is
          break;
        case "LastTrade":
          // Order by the most recent trade - we'll handle this after fetching
          break;
        case "CreationTime":
          // Order by creation time (newest first)
          orderBy.createdAt = "desc";
          break;
        case "LastReply":
          // Order by reply count (most replies first)
          orderBy.replyCount = "desc";
          break;
        case "CurrentlyLive":
          // Order by live status first, then by creation time
          orderBy = [{ isLive: "desc" }, { createdAt: "desc" }];
          break;
        case "MarketCap":
          // Order by market cap (highest first)
          orderBy.market = {
            marketCap: "desc",
          };
          break;
        default:
          // Default to featured order
          break;
      }

      const tokens = await prisma.token.findMany({
        where: whereClause,
        orderBy,
        include: {
          creator: true,
          market: true,
          socials: true,
          tags: true,
          trades: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      // Fetch SOL price in USD once
      const livePriceDB = await prisma.liveSolPrice.findUnique({
        where: { symbol: "SOL" },
      });
      const livePrice = await getSolPriceUSD();
      const solPrice = livePriceDB?.price || livePrice;

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

      // Calculate threadCount for each token
      const threadCounts = await Promise.all(
        tokens.map(async (token: any) => {
          const threads = await prisma.thread.findMany({
            where: { coin_id: token.id.toString() },
            select: { id: true },
          });
          const threadIds = threads.map((t) => t.id);
          const threadCount = threads.length;
          let replyCount = 0;
          if (threadIds.length > 0) {
            replyCount = await prisma.reply.count({
              where: { thread_id: { in: threadIds } },
            });
          }
          return { tokenId: token.id, threadCount: threadCount + replyCount };
        })
      );
      const threadCountMap = Object.fromEntries(
        threadCounts.map((tc) => [tc.tokenId, tc.threadCount])
      );

      // Handle LastTrade sorting after fetching
      if (filter === "LastTrade") {
        tokens.sort((a: any, b: any) => {
          const aLastTrade = a.trades?.[0]?.createdAt;
          const bLastTrade = b.trades?.[0]?.createdAt;

          if (!aLastTrade && !bLastTrade) return 0;
          if (!aLastTrade) return 1;
          if (!bLastTrade) return -1;

          return (
            new Date(bLastTrade).getTime() - new Date(aLastTrade).getTime()
          );
        });
      }

      const cards = tokens.map((token: any) => ({
        id: `${token.id}`,
        cid: token.cid,
        altText: token.name,
        symbol: token.symbol,
        name: token.name.toUpperCase(),
        timeAgo: getTimeAgo(token.createdAt),
        description: token.description,
        readMoreLink: `/coins/${token.symbol.toLowerCase()}`,
        creator: {
          name: token.creator.name,
          verified: token.creator.isVerified,
        },
        marketCap: token.finalMarketCap || 0,
        //@ts-ignore
        replies:
          token.socials?.reduce(
            (acc: number, s: any) => acc + (s.commentCount || 0),
            0
          ) || 0,
        nsfw: token.nsfw || false,
        tags: token.tags.map((tag: any) => tag.id),
        network: token.network || "solana",
        progress: token.progress,
        isLive: token.isLive || false,
        lastTrade: token.trades?.[0]
          ? getTimeAgo(token.trades[0].createdAt)
          : null,
        tradeCount: token.trades?.length || 0,
        lastTradeDetails: token.trades?.[0]
          ? {
              price: token.trades[0].price,
              amount: token.trades[0].amount,
              side: token.trades[0].side,
              createdAt: token.trades[0].createdAt,
            }
          : null,
        threadCount: threadCountMap[token.id] || 0,
        contractAddress: token.mintAccount,
        volume: `$${(volumeMap[token.id] || 0).toLocaleString()}`,
      }));

      const tagCounts = await prisma.tag.findMany({
        select: {
          id: true,
          label: true,
          _count: {
            select: { tokens: true },
          },
        },
      });

      const formattedTags = tagCounts.map((tag: any) => ({
        id: tag.id,
        label: tag.label,
        active: tags ? (tags as string).split(",").includes(tag.id) : false,
        count: tag._count.tokens,
      }));

      return res.json({
        success: true,
        data: {
          cards,
          tags: formattedTags,
        },
      });
    } catch (error) {
      console.error("Error in getFeaturedCards:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };

  getFilteredTokens = async (req: Request, res: Response) => {
    try {
      const { filter, tags, nsfw = false } = req.query;

      let whereClause: any = {};

      if (tags) {
        whereClause.tags = {
          some: {
            id: {
              in: (tags as string).split(","),
            },
            active: true,
          },
        };
      }

      // whereClause.status = "ACTIVE";

      if (nsfw === "false") {
        whereClause.nsfw = false;
      }

      let orderBy: any = {};

      switch (filter) {
        case "Featured":
          whereClause.featured = true;
          break;
        case "LastTrade":
          // Post-fetch sorting
          break;
        case "CreationTime":
          orderBy.createdAt = "desc";
          break;

        case "CurrentlyLive":
          whereClause.isLive = true;
          orderBy = [{ isLive: "desc" }, { createdAt: "desc" }];
          break;
        case "MostViewed24h":
          orderBy.viewCount = "asc";
          break;
        case "MarketCap":
          orderBy.market = {
            marketCap: "asc",
          };

          break;
        default:
          break;
      }

      // console.log(whereClause);
      const tokens = await prisma.token.findMany({
        where: whereClause,
        orderBy,
        take: 10,
        include: {
          creator: true,
          market: true,
          socials: true,
          tags: true,
          trades: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });
      // const tagsw = tokens.flatMap(token => token.tags.map((tag: any) => tag.id));
      // console.log("Tags in tokens:", tokens[0]?.tags);

      const livePriceDB = await prisma.liveSolPrice.findUnique({
        where: { symbol: "SOL" },
      });
      const livePrice = await getSolPriceUSD();
      const solPrice = livePriceDB?.price || livePrice;
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

      const threadCounts = await Promise.all(
        tokens.map(async (token: any) => {
          const threads = await prisma.thread.findMany({
            where: { coin_id: token.id.toString() },
            select: { id: true },
          });
          const threadIds = threads.map((t) => t.id);
          const threadCount = threads.length;
          let replyCount = 0;
          if (threadIds.length > 0) {
            replyCount = await prisma.reply.count({
              where: { thread_id: { in: threadIds } },
            });
          }
          return { tokenId: token.id, threadCount: threadCount + replyCount };
        })
      );
      const threadCountMap = Object.fromEntries(
        threadCounts.map((tc) => [tc.tokenId, tc.threadCount])
      );

      if (filter === "LastTrade") {
        tokens.sort((a: any, b: any) => {
          const aLastTrade = a.trades?.sort(
            (x: any, y: any) =>
              new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
          )[0]?.createdAt;
          const bLastTrade = b.trades?.sort(
            (x: any, y: any) =>
              new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
          )[0]?.createdAt;

          if (!aLastTrade && !bLastTrade) return 0;
          if (!aLastTrade) return 1;
          if (!bLastTrade) return -1;

          return (
            new Date(bLastTrade).getTime() - new Date(aLastTrade).getTime()
          );
        });
      }

      if (filter === "MarketCap") {
        tokens.sort((a: any, b: any) => {
          const aMarketCap = a.finalMarketCap || 0;
          const bMarketCap = b.finalMarketCap || 0;
          return bMarketCap - aMarketCap;
        });
      }

      if (filter === "MostViewed24h") {
        tokens.sort((a: any, b: any) => {
          const aViewCount = a.viewCount || 0;
          const bViewCount = b.viewCount || 0;
          return bViewCount - aViewCount;
        });
      }

      if (filter === "LastReply") {
        // Sort by last reply time
        const tokenLastReplies = await Promise.all(
          tokens.map(async (token) => {
            const thread = await prisma.thread.findFirst({
              where: { coin_id: token.id.toString() },
              include: {
                replies: {
                  orderBy: { created_at: "desc" },
                  take: 1,
                },
              },
              orderBy: { created_at: "desc" },
            });

            const lastThreadTime = thread?.created_at;
            const lastReplyTime = thread?.replies[0]?.created_at;
            if (lastThreadTime && lastReplyTime) {
              return {
                tokenId: token.id,
                lastActivityTime:
                  lastReplyTime > lastThreadTime
                    ? lastReplyTime
                    : lastThreadTime,
              };
            } else {
              // If no replies, use thread creation time
              return {
                tokenId: token.id,
                lastActivityTime: lastThreadTime || new Date(0), // Default to epoch if no activity
              };
            }
          })
        );

        tokens.sort((a, b) => {
          const aActivity = tokenLastReplies.find(
            (t) => t.tokenId === a.id
          )?.lastActivityTime;
          const bActivity = tokenLastReplies.find(
            (t) => t.tokenId === b.id
          )?.lastActivityTime;

          if (!aActivity && !bActivity) return 0;
          if (!aActivity) return 1;
          if (!bActivity) return -1;

          return bActivity.getTime() - aActivity.getTime();
        });
      }

      const test = await prisma.token.findMany({
        where: {
          tags: {
            some: {
              id: {
                in: ["sol"],
              },
            },
          },
        },
        include: {
          tags: true,
        },
      });
      // console.log("Tokens with tag `newtag`:", test.length);

      const userCounts = await Promise.all(
        tokens.map(async (token: any) => {
          const count = await prisma.userToken.count({
            where: {
              tokenId: token.id,
              tokenAmount: { gt: 0 },
            },
          });
          return { tokenId: token.id, count };
        })
      );

      const userCountMap = Object.fromEntries(
        userCounts.map((u) => [u.tokenId, u.count])
      );

      const cards = tokens.map((token: any) => ({
        id: `${token.id}`,
        cid: token.cid,
        altText: token.name,
        symbol: token.symbol,
        name: token.name.toUpperCase(),
        timeAgo: getTimeAgo(token.createdAt),
        description: token.description,
        readMoreLink: `/coins/${token.mintAccount}`,
        creator: {
          name: token.creator.name,
          verified: token.creator.isVerified,
        },
        marketCap: token.finalMarketCap || 0,
        //@ts-ignore
        replies:
          token.socials?.reduce(
            (acc: number, s: any) => acc + (s.commentCount || 0),
            0
          ) || 0,
        nsfw: token.nsfw || false,
        tags: token.tags.map((tag: any) => tag.id),
        network: token.network || "solana",
        progress: token.progress,
        isLive: token.isLive || false,
        lastTrade: token.trades?.[0]
          ? getTimeAgo(token.trades[0].createdAt)
          : null,
        tradeCount: token.trades?.length || 0,
        lastTradeDetails: token.trades?.[0]
          ? {
              price: token.trades[0].price,
              amount: token.trades[0].amount,
              side: token.trades[0].side,
              createdAt: token.trades[0].createdAt,
            }
          : null,
        threadCount: threadCountMap[token.id] || 0,
        contractAddress: token.mintAccount,
        volume: `$${(volumeMap[token.id] || 0).toLocaleString()}`,
        viewCount: token.viewCount || 0,
        stats: {
          users: userCountMap[token.id] || 0,
          // top10: top10Map[token.id] || 0,
        },
      }));

      return res.json({
        success: true,
        data: {
          cards,
        },
      });
    } catch (error) {
      console.error("Error in getFilteredTokens:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };

  hideCard = async (req: Request, res: Response) => {
    try {
      const { tokenId, userId } = req.body;
      await prisma.hiddenCard.create({
        data: {
          userId: Number(userId),
          tokenId: Number(tokenId),
        },
      });
      return res.json({
        success: true,
      });
    } catch (error) {
      console.error("Error hiding card:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };

  getHiddenCards = async (req: Request, res: Response) => {
    try {
      const { userId, limit = 20, offset = 0 } = req.query;
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, error: "userId is required" });
      }
      const totalCount = await prisma.hiddenCard.count({
        where: { userId: Number(userId) },
      });
      const hiddenCards = await prisma.hiddenCard.findMany({
        where: { userId: Number(userId) },
        take: Number(limit),
        skip: Number(offset),
        orderBy: {
          hiddenAt: "desc",
        },
        include: { token: true },
      });
      // Only return the token objects
      const tokens = hiddenCards.map((hc) => hc.token);
      return res.json({
        success: true,
        data: {
          cards: tokens,
          pagination: {
            total: totalCount,
            limit: Number(limit),
            offset: Number(offset),
          },
        },
      });
    } catch (error) {
      console.error("Error getting hidden cards:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };

  unhideCard = async (req: Request, res: Response) => {
    try {
      const { tokenId, userId } = req.body;
      const hiddenCard = await prisma.hiddenCard.findUnique({
        where: {
          userId_tokenId: { userId: Number(userId), tokenId: Number(tokenId) },
        },
      });
      if (!hiddenCard) {
        return res
          .status(404)
          .json({ success: false, message: "Hidden card not found" });
      }
      await prisma.hiddenCard.delete({
        where: {
          userId_tokenId: { userId: Number(userId), tokenId: Number(tokenId) },
        },
      });
      return res.json({ success: true });
    } catch (error) {
      console.error("Error unhiding card:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }
  };
}
