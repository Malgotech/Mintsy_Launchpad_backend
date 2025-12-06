import { Request, Response } from "express";
import { PrismaClient } from '@prisma/client';
import { getActiveUsersCount, getActiveUserIds } from "../utils/socket";

const prisma = new PrismaClient();

export class AdminController {
  // Get token statistics for admin dashboard
  getTokenStats = async (req: Request, res: Response) => {
    try {
      // Get total count of tokens
      const totalTokens = await prisma.token.count();

      // Get count of featured tokens
      const featuredTokens = await prisma.token.count({
        where: {
          featured: true
        }
      });

      // Get count of blacklisted tokens
      const blacklistedTokens = await prisma.token.count({
        where: {
          blacklisted: true
        }
      });

      // Get count of flagged tokens
      const flaggedTokens = await prisma.token.count({
        where: {
          flagged: true
        }
      });

      const stats = {
        totalTokens,
        featuredTokens,
        blacklistedTokens,
        flaggedTokens
      };

      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error("Error getting token stats:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };

  // Get detailed token list for admin dashboard
  getTokenList = async (req: Request, res: Response) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        featured, 
        blacklisted,
        flagged,
        search 
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      
      let whereClause: any = {};

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Filter by featured
      if (featured !== undefined) {
        whereClause.featured = featured === 'true';
      }

      // Filter by blacklisted
      if (blacklisted !== undefined) {
        whereClause.blacklisted = blacklisted === 'true';
      }

      // Filter by flagged
      if (flagged !== undefined) {
        whereClause.flagged = flagged === 'true';
      }

      // Search by name or symbol
      if (search) {
        whereClause.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { symbol: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // Get total count for pagination
      const totalCount = await prisma.token.count({ where: whereClause });

      // Get tokens with pagination
      const tokens = await prisma.token.findMany({
        where: whereClause,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              userAccount: true,
              name: true,
              isVerified: true
            }
          },
          market: {
            select: {
              currentPrice: true,
              marketCap: true,
              volume24h: true
            }
          }
        }
      });

      const formattedTokens = tokens.map(token => ({
        id: token.id,
        name: token.name,
        symbol: token.symbol,
        status: token.status,
        cid: token.cid,
        mintAccount: token.mintAccount,
        featured: token.featured,
        blacklisted: token.blacklisted,
        flagged: token.flagged,
        createdAt: token.createdAt,
        creator: token.creator,
        market: token.market,
        supply: token.supply,
        network: token.network
      }));

      return res.json({
        success: true,
        data: {
          tokens: formattedTokens,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            totalCount,
            totalPages: Math.ceil(totalCount / Number(limit))
          }
        }
      });
    } catch (error) {
      console.error("Error getting token list:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };

  // Update token status (feature, blacklist, flag, etc.)
  updateTokenStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { featured, status, blacklisted, flagged } = req.body;

      const updateData: any = {};
      
      if (featured !== undefined) updateData.featured = featured;
      if (status !== undefined) updateData.status = status;
      if (blacklisted !== undefined) updateData.blacklisted = blacklisted;
      if (flagged !== undefined) updateData.flagged = flagged;

      const token = await prisma.token.update({
        where: { id: Number(id) },
        data: updateData,
        include: {
          creator: {
            select: {
              id: true,
              userAccount: true,
              name: true,
              isVerified: true
            }
          }
        }
      });

      return res.json({
        success: true,
        data: token
      });
    } catch (error) {
      console.error("Error updating token status:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };

  // Get active users (admin only)
  getActiveUsers = async (req: Request, res: Response) => {
    try {
      const activeUsersCount = getActiveUsersCount();
      const activeUserIds = getActiveUserIds();
      
      // Get active users with their details
      const activeUsers = await prisma.user.findMany({
        where: {
          id: {
            in: activeUserIds
          }
        },
        select: {
          id: true,
          userAccount: true,
          name: true,
          avatarUrl: true,
          lastActive: true,
          isActive: true
        }
      });

      return res.json({
        success: true,
        data: {
          activeUsersCount,
          activeUsers,
          activeUserIds
        }
      });
    } catch (error) {
      console.error("Error getting active users:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };

  // Get inactive users (admin only)
  getInactiveUsers = async (req: Request, res: Response) => {
    try {
      const { hours = 24 } = req.query; // Default to 24 hours
      const hoursNum = parseInt(hours as string);
      
      if (isNaN(hoursNum) || hoursNum < 0) {
        return res.status(400).json({ 
          success: false,
          error: "Invalid hours parameter" 
        });
      }

      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hoursNum);

      const inactiveUsers = await prisma.user.findMany({
        where: {
          lastActive: { lt: cutoffTime }
        },
        select: {
          id: true,
          userAccount: true,
          name: true,
          avatarUrl: true,
          lastActive: true,
          isActive: true
        },
        orderBy: {
          lastActive: 'asc'
        }
      });

      return res.json({
        success: true,
        data: {
          inactiveUsersCount: inactiveUsers.length,
          inactiveUsers,
          cutoffTime: cutoffTime.toISOString()
        }
      });
    } catch (error) {
      console.error("Error getting inactive users:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };

  // Get user activity statistics (admin only)
  getUserActivityStats = async (req: Request, res: Response) => {
    try {
      const activeUsersCount = getActiveUsersCount();
      
      // Get total users count
      const totalUsers = await prisma.user.count();
      
      // Get users active in last 24 hours
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);
      
      const activeLast24Hours = await prisma.user.count({
        where: {
          lastActive: { gte: last24Hours }
        }
      });

      return res.json({
        success: true,
        data: {
          totalUsers,
          currentlyActive: activeUsersCount,
          activeLast24Hours
        }
      });
    } catch (error) {
      console.error("Error getting user activity stats:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };

  // Get analytics data for admin dashboard
  getAnalytics = async (req: Request, res: Response) => {
    try {
      const { range = 'day', from, to } = req.query;
      
      // Determine date range
      let startDate: Date;
      let endDate: Date;
      
      if (range === 'custom' && from && to) {
        startDate = new Date(from as string);
        endDate = new Date(to as string);
      } else {
        const now = new Date();
        
        switch (range) {
          case 'day':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
          case 'week':
            const dayOfWeek = now.getDay();
            const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        }
      }

      // Get previous period for comparison
      const periodDuration = endDate.getTime() - startDate.getTime();
      const previousEndDate = new Date(startDate.getTime() - 1);
      const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

      // Get launched tokens (tokens created in period)
      const launchedCount = await prisma.token.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const previousLaunchedCount = await prisma.token.count({
        where: {
          createdAt: {
            gte: previousStartDate,
            lte: previousEndDate
          }
        }
      });

      // Get graduated tokens (tokens with graduatedAt in period)
      const graduatedCount = await prisma.token.count({
        where: {
          graduatedAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const previousGraduatedCount = await prisma.token.count({
        where: {
          graduatedAt: {
            gte: previousStartDate,
            lte: previousEndDate
          }
        }
      });

      // Get bonded tokens (tokens with bonding curve in period)
      const bondedCount = await prisma.token.count({
        where: {
          bondingCurve: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      });

      const previousBondedCount = await prisma.token.count({
        where: {
          bondingCurve: {
            createdAt: {
              gte: previousStartDate,
              lte: previousEndDate
            }
          }
        }
      });

      // Get daily volume (sum of trade amounts in period)
      const dailyVolumeResult = await prisma.trade.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          price: true
        }
      });

      const previousDailyVolumeResult = await prisma.trade.aggregate({
        where: {
          createdAt: {
            gte: previousStartDate,
            lte: previousEndDate
          }
        },
        _sum: {
          price: true
        }
      });

      const dailyVolume = dailyVolumeResult._sum.price || 0;
      const previousDailyVolume = previousDailyVolumeResult._sum.price || 0;

      // Get active traders (unique users who traded in period)
      const activeTradersCount = await prisma.trade.groupBy({
        by: ['userId'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          userId: true
        }
      }).then(result => result.length);

      const previousActiveTradersCount = await prisma.trade.groupBy({
        by: ['userId'],
        where: {
          createdAt: {
            gte: previousStartDate,
            lte: previousEndDate
          }
        },
        _count: {
          userId: true
        }
      }).then(result => result.length);

      // Get current liquidity (sum of all market liquidity)
      const liquidityResult = await prisma.market.aggregate({
        _sum: {
          liquidity: true
        }
      });

      const previousLiquidityResult = await prisma.market.aggregate({
        where: {
          updatedAt: {
            gte: previousStartDate,
            lte: previousEndDate
          }
        },
        _sum: {
          liquidity: true
        }
      });

      const liquidity = liquidityResult._sum.liquidity || 0;
      const previousLiquidity = previousLiquidityResult._sum.liquidity || 0;

      // Calculate percentage changes
      const calculatePercentageChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const launchedPercentageChange = calculatePercentageChange(launchedCount, previousLaunchedCount);
      const graduatedPercentageChange = calculatePercentageChange(graduatedCount, previousGraduatedCount);
      const bondedPercentageChange = calculatePercentageChange(bondedCount, previousBondedCount);
      const dailyVolumePercentageChange = calculatePercentageChange(dailyVolume, previousDailyVolume);
      const activeTradersPercentageChange = calculatePercentageChange(activeTradersCount, previousActiveTradersCount);
      const liquidityPercentageChange = calculatePercentageChange(liquidity, previousLiquidity);

      return res.json({
        success: true,
        data: {
          launched: {
            count: launchedCount,
            percentageChange: launchedPercentageChange,
            trend: launchedPercentageChange >= 0 ? "up" : "down",
            description: "Coins launched in selected period"
          },
          graduated: {
            count: graduatedCount,
            percentageChange: graduatedPercentageChange,
            trend: graduatedPercentageChange >= 0 ? "up" : "down",
            description: "Coins graduated in period"
          },
          bonded: {
            count: bondedCount,
            percentageChange: bondedPercentageChange,
            trend: bondedPercentageChange >= 0 ? "up" : "down",
            description: "Coins bonded in period"
          },
          dailyVolume: {
            amount: Math.round(dailyVolume),
            currency: "USD",
            percentageChange: dailyVolumePercentageChange,
            trend: dailyVolumePercentageChange >= 0 ? "up" : "down",
            description: "Volume (GMT/BST)"
          },
          activeTraders: {
            count: activeTradersCount,
            percentageChange: activeTradersPercentageChange,
            trend: activeTradersPercentageChange >= 0 ? "up" : "down",
            description: "Unique traders in period"
          },
          liquidity: {
            amount: Math.round(liquidity),
            currency: "USD",
            percentageChange: liquidityPercentageChange,
            trend: liquidityPercentageChange >= 0 ? "up" : "down",
            description: "Current liquidity ($)"
          },
          period: {
            range: range as string,
            from: startDate.toISOString(),
            to: endDate.toISOString(),
            previousPeriod: {
              from: previousStartDate.toISOString(),
              to: previousEndDate.toISOString()
            }
          }
        },
        message: "Analytics data retrieved successfully"
      });
    } catch (error) {
      console.error("Error getting analytics:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };

  // Get all tokens for admin (without pagination)
  getAllTokens = async (req: Request, res: Response) => {
    try {
      const { status, featured, blacklisted, flagged, search } = req.query;
      
      let whereClause: any = {};

      // Filter by status
      if (status) {
        whereClause.status = status;
      }

      // Filter by featured
      if (featured !== undefined) {
        whereClause.featured = featured === 'true';
      }

      // Filter by blacklisted
      if (blacklisted !== undefined) {
        whereClause.blacklisted = blacklisted === 'true';
      }

      // Filter by flagged
      if (flagged !== undefined) {
        whereClause.flagged = flagged === 'true';
      }

      // Search by name or symbol
      if (search) {
        whereClause.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { symbol: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const tokens = await prisma.token.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              userAccount: true,
              name: true,
              isVerified: true
            }
          },
          market: {
            select: {
              currentPrice: true,
              marketCap: true,
              volume24h: true,
              priceChange24h: true
            }
          },
          socials: {
            select: {
              type: true,
              url: true
            }
          },
          tags: {
            select: {
              id: true,
              label: true
            }
          }
        }
      });

      const formattedTokens = tokens.map(token => {
        // Map socials to object
        const socials: Record<string, string> = {};
        token.socials.forEach((link) => {
          if (link.type === "TWITTER") socials.twitter = link.url;
          if (link.type === "TELEGRAM") socials.telegram = link.url;
          if (link.type === "DISCORD") socials.discord = link.url;
          if (link.type === "WEBSITE") socials.website = link.url;
        });

        return {
          id: token.id,
          mintAccount: token.mintAccount,
          symbol: token.symbol,
          name: token.name,
          description: token.description,
          imageUrl: token.imageUrl,
          status: token.status,
          featured: token.featured,
          blacklisted: token.blacklisted,
          flagged: token.flagged,
          supply: token.supply,
          decimals: token.decimals,
          network: token.network,
          createdAt: token.createdAt,
          graduatedAt: token.graduatedAt,
          creator: token.creator,
          market: token.market,
          socials,
          tags: token.tags,
          userCount: token.userCount,
          replyCount: token.replyCount,
          isLive: token.isLive,
          nsfw: token.nsfw
        };
      });

      return res.json({
        success: true,
        data: {
          tokens: formattedTokens,
          totalCount: formattedTokens.length
        }
      });
    } catch (error) {
      console.error("Error getting all tokens:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };

  // Update state variables
  updateState = async (req: Request, res: Response) => {
    try {
      const { 
        treasury, 
        lpManager, 
        buy_fee, 
        sell_fee, 
        launch_fee, 
        discount, 
        refferral_amount, 
        early_brid_thershold, 
        minimum_threshold, 
        adminWallet 
      } = req.body;

      // Validate admin wallet
      if (!adminWallet) {
        return res.status(400).json({
          success: false,
          error: "Admin wallet is required"
        });
      }

      // Here you would typically call your Solana program to update state
      // For now, we'll just return success
      console.log("Updating state with:", {
        treasury,
        lpManager,
        buy_fee,
        sell_fee,
        launch_fee,
        discount,
        refferral_amount,
        early_brid_thershold,
        minimum_threshold,
        adminWallet
      });

      return res.json({
        success: true,
        message: "State updated successfully"
      });
    } catch (error) {
      console.error("Error updating state:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };

  // Update market status
  updateMarket = async (req: Request, res: Response) => {
    try {
      const { mint, isBlacklisted, isPaused, adminWallet } = req.body;

      // Validate required fields
      if (!mint || !adminWallet) {
        return res.status(400).json({
          success: false,
          error: "Mint address and admin wallet are required"
        });
      }

      // Here you would typically call your Solana program to update market
      // For now, we'll just return success
      console.log("Updating market with:", {
        mint,
        isBlacklisted,
        isPaused,
        adminWallet
      });

      return res.json({
        success: true,
        message: "Market updated successfully"
      });
    } catch (error) {
      console.error("Error updating market:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };

  // Withdraw funds
  withdraw = async (req: Request, res: Response) => {
    try {
      const { tokenMint, adminWallet } = req.body;

      // Validate required fields
      if (!tokenMint || !adminWallet) {
        return res.status(400).json({
          success: false,
          error: "Token mint and admin wallet are required"
        });
      }

      // Here you would typically call your Solana program to withdraw
      // For now, we'll just return success
      console.log("Withdrawing with:", {
        tokenMint,
        adminWallet
      });

      return res.json({
        success: true,
        message: "Withdrawal initiated successfully"
      });
    } catch (error) {
      console.error("Error withdrawing:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };
} 