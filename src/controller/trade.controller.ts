import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { emitChartUpdate, getIO } from "../utils/socket";
import { emitChartUpdateForCoin } from "../utils/socket";
import { getSolPriceUSD } from "../utils/helpers";

const prisma = new PrismaClient();

// side
// :
// "BUY"
// solAmount
// :
// "0.01"
// tokenAmount
// :
// 711947.6775922365

type SolPriceCache = {
  price: number;
  timestamp: number;
};

let solPriceCache: SolPriceCache | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class TradeController {
  // placeOrder = async (req: Request, res: Response) => {
  //   try {
  //     const {
  //       userId,
  //       tokenId,
  //       solAmount,
  //       tokenAmount,
  //       side,
  //       txHash,
  //       marketCap,
  //     } = req.body;
  //     if (!userId || !tokenId || !side || !txHash) {
  //       return res
  //         .status(400)
  //         .json({ success: false, error: "Missing required fields" });
  //     }
  //     // Convert solAmount and tokenAmount to numbers if they are strings
  //     const livePriceDB = await prisma.liveSolPrice.findUnique({
  //       where: { symbol: "SOL" },
  //     });
  //     const solPrice = livePriceDB?.price;
  //     let solAmt = solAmount;
  //     let tokenAmt = tokenAmount;
  //     let marketCapF = marketCap * Number(solPrice);
  //     if (typeof solAmt === "string") solAmt = parseFloat(solAmt);
  //     if (typeof tokenAmt === "string") tokenAmt = parseFloat(tokenAmt);
  //     if (typeof marketCapF === "string") marketCapF = parseFloat(marketCapF);
  //     if (
  //       solAmt === undefined ||
  //       tokenAmt === undefined ||
  //       marketCapF === undefined
  //     ) {
  //       return res
  //         .status(400)
  //         .json({ success: false, error: "Missing solAmount or tokenAmount" });
  //     }

  //     // Ensure tokenId is an integer, handle cases like 'nc_100'
  //     let tokenIdInt = tokenId;
  //     if (typeof tokenId === "string") {
  //       if (tokenId.includes("_")) {
  //         const parts = tokenId.split("_");
  //         tokenIdInt = parseInt(parts[1], 10);
  //       } else {
  //         tokenIdInt = parseInt(tokenId, 10);
  //       }
  //     }
  //     if (!tokenIdInt || isNaN(tokenIdInt)) {
  //       return res
  //         .status(400)
  //         .json({ success: false, error: "Invalid or missing tokenId" });
  //     }

  //     // Find the marketId for the given tokenId
  //     const market = await prisma.market.findUnique({
  //       where: { tokenId: tokenIdInt },
  //     });
  //     if (!market) {
  //       return res
  //         .status(404)
  //         .json({ success: false, error: "Market not found for this token" });
  //     }
  //     const marketId = market.id;

  //     // Fetch token name and symbol
  //     const token = await prisma.token.findUnique({
  //       where: { id: tokenIdInt },
  //     });
  //     if (!token) {
  //       return res
  //         .status(404)
  //         .json({ success: false, error: "Token not found" });
  //     }
  //     const tokenName = token.name;
  //     const tokenSymbol = token.symbol;

  //     const result = await prisma.$transaction(async (tx) => {
  //       // 1. Create the trade using prismaService to trigger chart updates
  //       const trade = await tx.trade.create({
  //         data: {
  //           userId,
  //           tokenId: tokenIdInt,
  //           marketId,
  //           amount: tokenAmt,
  //           price: Number(solAmt),
  //           side,
  //           txHash,
  //           marketCap: marketCapF,
  //         },
  //       });

  //       // 2. Update or create UserToken
  //       let userToken;
  //       const existing = await tx.userToken.findUnique({
  //         where: { userId_tokenId: { userId, tokenId: tokenIdInt } },
  //       });
  //       if (existing) {
  //         let newTokenAmount =
  //           side === "BUY"
  //             ? (existing.tokenAmount || 0) + tokenAmt
  //             : (existing.tokenAmount || 0) - tokenAmt;
  //         if (newTokenAmount < 0) newTokenAmount = 0;
  //         let newSolAmount =
  //           side === "BUY"
  //             ? (existing.solAmount || 0) + solAmt
  //             : (existing.solAmount || 0) - solAmt;
  //         if (newSolAmount < 0) newSolAmount = 0;
  //         userToken = await tx.userToken.update({
  //           where: { userId_tokenId: { userId, tokenId: tokenIdInt } },
  //           data: {
  //             solAmount: newSolAmount,
  //             tokenAmount: newTokenAmount,
  //             tokenName,
  //             tokenSymbol,
  //           },
  //         });
  //       } else if (side === "BUY") {
  //         userToken = await tx.userToken.create({
  //           data: {
  //             userId,
  //             tokenId: tokenIdInt,
  //             solAmount: solAmt,
  //             tokenAmount: tokenAmt,
  //             tokenName,
  //             tokenSymbol,
  //           },
  //         });
  //       }
  //       // If SELL and no holding, do nothing (or could error)
  //       // Fetch the created trade with user and token info
  //       const fullTrade = await tx.trade.findUnique({
  //         where: { id: trade.id },
  //         include: { user: true, token: true },
  //       });
  //       if (fullTrade) {
  //         const tradePayload = {
  //           id: `trade_${fullTrade.id}`,
  //           orderId: `order_${fullTrade.txHash}`,
  //           coinId: fullTrade.tokenId,
  //           type: fullTrade.side,
  //           amount: fullTrade.price,
  //           currency: "SOL",
  //           tokensReceived: fullTrade.amount,
  //           price: `${fullTrade.price}`,
  //           status: "completed",
  //           timestamp: fullTrade.createdAt.toISOString(),
  //           txHash: fullTrade.txHash,
  //           userName: fullTrade.user?.name || null,
  //           userId: fullTrade.user?.id || null,
  //           contractAddress: fullTrade.token?.mintAccount || null,
  //           tokenName: fullTrade.token?.name || null,
  //           marketCap: marketCapF || 0,
  //         };
  //         getIO().emit("trade-created", {
  //           channel: "new-trades",
  //           data: tradePayload,
  //         });
  //       }

  //       // --- MARKET CAP UPDATE LOGIC ---
  //       // Get total supply for the token
  //       const tokenData = await tx.token.findUnique({
  //         where: { id: tokenIdInt },
  //       });
  //       const totalSupply = tokenData?.supply || 0;
  //       // Calculate price per token in SOL
  //       const pricePerTokenInSol = tokenAmt > 0 ? solAmt / tokenAmt : 0; // get from contract  10/100 = 0.1
  //       // Fetch current SOL price in USD from CoinGecko API
  //       const { marketCap } = req.body;

  //       const progress = marketCap / 20000;
  //       const progressPercentage = progress * 100;

  //       // Update the market cap in the Token table (instead of Market)
  //       await tx.token.update({
  //         where: { id: tokenIdInt },
  //         data: {
  //           finalMarketCap: marketCapF,
  //           lastPrice: pricePerTokenInSol,
  //           progress: progressPercentage,
  //         },
  //       });

  //       // Calculate user count (users holding this token)
  //       const users = await tx.userToken.count({
  //         where: {
  //           tokenId: tokenIdInt,
  //           tokenAmount: { gt: 0 },
  //         },
  //       });
  //       // Calculate top10 percentage
  //       const tokenSupply = totalSupply;
  //       let top10 = 0;
  //       if (tokenSupply > 0) {
  //         const top10Holders = await tx.userToken.findMany({
  //           where: {
  //             tokenId: tokenIdInt,
  //             tokenAmount: { gt: 0 },
  //           },
  //           orderBy: { tokenAmount: "desc" },
  //           take: 10,
  //         });
  //         const top10Sum = top10Holders.reduce(
  //           (sum, ut) => sum + (ut.tokenAmount || 0),
  //           0
  //         );
  //         top10 = Number(((top10Sum / tokenSupply) * 100).toFixed(2));
  //       }

  //       // Emit token-update event after updating the token, including stats
  //       const updatedToken = await tx.token.findUnique({
  //         where: { id: tokenIdInt },
  //         include: { market: true },
  //       });
  //       if (updatedToken) {
  //         // Calculate 24h volume in USD
  //         const livePriceDB = await prisma.liveSolPrice.findUnique({
  //           where: { symbol: "SOL" },
  //         });
  //         const solPrice = livePriceDB?.price;
  //         const now = new Date();
  //         const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  //         const trades = await tx.trade.findMany({
  //           where: {
  //             tokenId: tokenIdInt,
  //             createdAt: { gte: since },
  //           },
  //         });
  //         const solAmount = trades.reduce(
  //           (sum, t) => sum + (Number(t.price) || 0),
  //           0
  //         );
  //         const volume = solPrice ? solAmount * solPrice : 0;
  //         getIO().emit("token-update", {
  //           token: updatedToken,
  //           stats: { users, top10 },
  //           volume: `$${(volume || 0).toLocaleString()}`,
  //         });
  //       }
  //       // emitChartUpdate(token.id.toString());
  //       // // --- UPDATE LAST PRICE LOGIC ---
  //       // // Update the token's lastPrice to the latest price per token in SOL
  //       // await tx.token.update({
  //       //   where: { id: tokenIdInt },
  //       //   data: { lastPrice: pricePerTokenInSol },
  //       // });
  //       // // --- END LAST PRICE LOGIC ---

  //       return userToken;
  //     });

  //     // Emit chart updates after the transaction is complete
  //     try {
  //       await emitChartUpdateForCoin(tokenIdInt.toString());
  //     } catch (error) {
  //       console.error("Error emitting chart updates:", error);
  //     }

  //     if (!result) {
  //       return res
  //         .status(400)
  //         .json({ success: false, error: "No user token updated/created" });
  //     }
  //     // Only return the requested fields
  //     const {
  //       userId: rUserId,
  //       tokenId: rTokenId,
  //       solAmount: rSolAmount,
  //       tokenAmount: rTokenAmount,
  //       tokenName: rTokenName,
  //       tokenSymbol: rTokenSymbol,
  //     } = result;
  //     return res.status(201).json({
  //       userId: rUserId,
  //       tokenId: rTokenId,
  //       solAmount: rSolAmount,
  //       tokenAmount: rTokenAmount,
  //       tokenName: rTokenName,
  //       tokenSymbol: rTokenSymbol,
  //     });
  //   } catch (error) {
  //     console.error("Error placing order:", error);
  //     return res.status(500).json({
  //       success: false,
  //       error: "Internal Server Error",
  //     });
  //   }
  // };

  placeOrder = async (req: Request, res: Response) => {
    try {
      const {
        userId,
        tokenId,
        solAmount,
        tokenAmount,
        side,
        txHash,
        marketCap,
      } = req.body;

      if (!userId || !tokenId || !side || !txHash) {
        return res
          .status(400)
          .json({ success: false, error: "Missing required fields" });
      }

      const livePriceDB = await prisma.liveSolPrice.findUnique({
        where: { symbol: "SOL" },
      });
      console.log("livePriceDB?.price ", livePriceDB?.price);
      let solPrice = livePriceDB?.price || 0;
      if (livePriceDB?.price == 0) {
        solPrice = await getSolPriceUSD();
      }
      console.log("solPrice", solPrice);

      let solAmt =
        typeof solAmount === "string" ? Number(solAmount) : solAmount;
      let tokenAmt =
        typeof tokenAmount === "string" ? Number(tokenAmount) : tokenAmount;
      let marketCapF = Number(marketCap);
      console.log(
        "solAmt,tokenAmount",
        marketCapF,
        solAmt,
        tokenAmount,
        marketCapF,
      );
      if (!solAmt || !tokenAmt || !marketCapF) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid amounts" });
      }

      let tokenIdInt = tokenId;
      if (typeof tokenId === "string") {
        tokenIdInt = tokenId.includes("_")
          ? Number(tokenId.split("_")[1])
          : Number(tokenId);
      }

      const market = await prisma.market.findUnique({
        where: { tokenId: tokenIdInt },
      });
      if (!market) return res.status(404).json({ error: "Market not found" });

      const token = await prisma.token.findUnique({
        where: { id: tokenIdInt },
      });
      if (!token) return res.status(404).json({ error: "Token not found" });

      const pricePerTokenInSol = tokenAmt > 0 ? solAmt / tokenAmt : 0;
      const progress = (marketCap / 20000) * 100;

      /* ================= TRANSACTION (ONLY WRITES) ================= */

      const txResult = await prisma.$transaction(
        async (tx: {
          trade: {
            create: (arg0: {
              data: {
                userId: any;
                tokenId: any;
                marketId: any;
                amount: any;
                price: any;
                side: any;
                txHash: any;
                marketCap: number;
              };
            }) => any;
          };
          userToken: {
            findUnique: (arg0: {
              where: { userId_tokenId: { userId: any; tokenId: any } };
            }) => any;
            update: (arg0: {
              where: { userId_tokenId: { userId: any; tokenId: any } };
              data: {
                solAmount: any;
                tokenAmount: any;
                tokenName: any;
                tokenSymbol: any;
              };
            }) => any;
            create: (arg0: {
              data: {
                userId: any;
                tokenId: any;
                solAmount: any;
                tokenAmount: any;
                tokenName: any;
                tokenSymbol: any;
              };
            }) => any;
          };
          token: {
            update: (arg0: {
              where: { id: any };
              data: {
                finalMarketCap: number;
                lastPrice: number;
                progress: number;
              };
            }) => any;
          };
        }) => {
          const trade = await tx.trade.create({
            data: {
              userId,
              tokenId: tokenIdInt,
              marketId: market.id,
              amount: tokenAmt,
              price: solAmt,
              side,
              txHash,
              marketCap: marketCapF,
            },
          });

          const existing = await tx.userToken.findUnique({
            where: { userId_tokenId: { userId, tokenId: tokenIdInt } },
          });

          let userToken;
          if (existing) {
            userToken = await tx.userToken.update({
              where: { userId_tokenId: { userId, tokenId: tokenIdInt } },
              data: {
                solAmount:
                  side === "BUY"
                    ? (existing.solAmount || 0) + solAmt
                    : Math.max((existing.solAmount || 0) - solAmt, 0),
                tokenAmount:
                  side === "BUY"
                    ? (existing.tokenAmount || 0) + tokenAmt
                    : Math.max((existing.tokenAmount || 0) - tokenAmt, 0),
                tokenName: token.name,
                tokenSymbol: token.symbol,
              },
            });
          } else if (side === "BUY") {
            userToken = await tx.userToken.create({
              data: {
                userId,
                tokenId: tokenIdInt,
                solAmount: solAmt,
                tokenAmount: tokenAmt,
                tokenName: token.name,
                tokenSymbol: token.symbol,
              },
            });
          }

          await tx.token.update({
            where: { id: tokenIdInt },
            data: {
              finalMarketCap: marketCapF * solPrice,
              lastPrice: pricePerTokenInSol,
              progress,
            },
          });

          return { trade, userToken };
        },
      );

      /* ================= POST TRANSACTION (SAME LOGIC) ================= */

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const users = await prisma.userToken.count({
        where: { tokenId: tokenIdInt, tokenAmount: { gt: 0 } },
      });

      let top10 = 0;
      if (token.supply > 0) {
        const top10Holders = await prisma.userToken.findMany({
          where: { tokenId: tokenIdInt, tokenAmount: { gt: 0 } },
          orderBy: { tokenAmount: "desc" },
          take: 10,
        });

        const top10Sum = top10Holders.reduce(
          (sum: any, ut: { tokenAmount: any }) => sum + (ut.tokenAmount || 0),
          0,
        );
        top10 = Number(((top10Sum / token.supply) * 100).toFixed(2));
      }

      const trades = await prisma.trade.findMany({
        where: { tokenId: tokenIdInt, createdAt: { gte: since } },
      });

      const solVolume = trades.reduce(
        (sum: number, t: { price: any }) => sum + Number(t.price || 0),
        0,
      );
      const volume = solVolume * solPrice;

      getIO().emit("trade-created", {
        id: `trade_${txResult.trade.id}`,
        orderId: `order_${txResult.trade.txHash}`,
        coinId: txResult.trade.tokenId,
        type: txResult.trade.side,
        amount: txResult.trade.price,
        currency: "SOL",
        tokensReceived: txResult.trade.amount,
        price: `${txResult.trade.price}`,
        status: "completed",
        timestamp: txResult.trade.createdAt.toISOString(),
        txHash: txResult.trade.txHash,
        contractAddress: token.mintAccount,
        tokenName: token.name,
        marketCap: marketCapF,
      });

      getIO().emit("token-update", {
        token,
        stats: { users, top10 },
        volume: `$${volume.toLocaleString()}`,
      });

      emitChartUpdate(tokenIdInt.toString());
      emitChartUpdateForCoin(tokenIdInt.toString());

      if (!txResult.userToken) {
        return res.status(400).json({ error: "User token not updated" });
      }

      return res.status(201).json({
        userId: txResult.userToken.userId,
        tokenId: txResult.userToken.tokenId,
        solAmount: txResult.userToken.solAmount,
        tokenAmount: txResult.userToken.tokenAmount,
        tokenName: txResult.userToken.tokenName,
        tokenSymbol: txResult.userToken.tokenSymbol,
      });
    } catch (error) {
      console.error("Error placing order:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };

  getTradeHistory = async (req: Request, res: Response) => {
    try {
      const { coinId, limit = 20, offset = 0 } = req.query;

      if (!coinId) {
        return res
          .status(400)
          .json({ success: false, error: "Missing coinId" });
      }

      const trades = await prisma.trade.findMany({
        where: {
          tokenId: Number(coinId),
        },
        include: {
          token: true,
          user: true,
        },
        take: Number(limit),
        skip: Number(offset),
        orderBy: {
          createdAt: "desc",
        },
      });

      const totalTrades = await prisma.trade.count({
        where: {
          tokenId: Number(coinId),
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          trades: trades.map(
            (trade: {
              id: any;
              txHash: any;
              tokenId: any;
              side: any;
              price: any;
              amount: any;
              createdAt: { toISOString: () => any };
              marketCap: any;
              user: { name: any; id: any };
            }) => ({
              id: `trade_${trade.id}`,
              orderId: `order_${trade.txHash}`,
              coinId: trade.tokenId,
              type: trade.side,
              amount: trade.price,
              currency: "SOL",
              tokensReceived: trade.amount,
              price: `$${trade.price}`,
              status: "completed",
              timestamp: trade.createdAt.toISOString(),
              txHash: trade.txHash,
              marketCap: trade?.marketCap || 0, // Assuming marketCap is stored in the trade
              userName: trade.user?.name || null,
              userId: trade.user.id || null,
            }),
          ),
          pagination: {
            total: totalTrades,
            limit: Number(limit),
            offset: Number(offset),
          },
        },
      });
    } catch (error) {
      console.error("Error getting trade history:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };

  getDailyVolume = async (req: Request, res: Response) => {
    try {
      const { coinId } = req.query;

      if (!coinId) {
        return res
          .status(400)
          .json({ success: false, error: "Missing coinId" });
      }

      const trades = await prisma.trade.findMany({
        where: {
          tokenId: Number(coinId),
          createdAt: {
            gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
          },
        },
        select: {
          amount: true,
        },
      });

      const totalVolume = trades.reduce(
        (sum: number, trade: { amount: any }) =>
          sum + Number(trade.amount || 0),
        0,
      );

      const tradeCount = trades.length;

      // ✅ SOL price cache (Binance)
      let solPrice: number;

      if (
        solPriceCache === null ||
        Date.now() - solPriceCache.timestamp > CACHE_DURATION
      ) {
        const response = await fetch(
          "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT",
        );
        const data = await response.json();

        solPriceCache = {
          price: Number(data.price),
          timestamp: Date.now(),
        };
      }

      solPrice = solPriceCache.price;

      return res.status(200).json({
        success: true,
        coinId,
        dailyVolume: totalVolume * solPrice,
        tradeCount,
      });
    } catch (error) {
      console.error("Error getting daily volume:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }
  };
}
