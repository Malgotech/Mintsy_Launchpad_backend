// src/index.ts
import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

import userRouter from "./routes/user.routes";
import tokenRouter from "./routes/token.routes";
import marketRouter from "./routes/market.routes";
import cardRouter from "./routes/card.routes";
import watchlistRouter from "./routes/watchlist.routes";
import chartRouter from "./routes/chart.routes";
import searchRouter from "./routes/search.routes";
import tradeRouter from "./routes/trade.routes";
import threadsRouter from "./routes/thread.routes";
import advanceRoutes from "./routes/advance.routes";
import watchlistRoutes from "./routes/watchlist.routes";
import adminRouter from "./routes/admin.routes";
import livekitRouter from "./routes/livekit.routes";
import tagRoutes from "./routes/tag.routes";
import referralRoutes from "./routes/referral.routes";
import rewardRoutes from "./routes/reward.routes";
import { startLivePriceCron } from "./service/livePriceCron";

// import webhookRouter from "./routes/webhook.routes";
dotenv.config();

const app = express();

app.use(cors({ origin: "*" }));

app.use(express.json());
//@ts-ignore
app.get("/", (_req: Request, res: Response) =>
  res.send("MSN Backend Service Live 🚀")
);

app.use("/api/v1/users", userRouter);
app.use("/api/v1/coins", tokenRouter);
app.use("/api/v1/markets", marketRouter);
app.use("/api/v1/cards", cardRouter);
app.use("/api/v1/watchlist", watchlistRouter);
app.use("/api/v1/charts", chartRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/trade", tradeRouter);
app.use("/api/v1/threads", threadsRouter);
app.use("/api/v1/advance", advanceRoutes);
app.use("/watchlist", watchlistRoutes);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/livekit", livekitRouter);
app.use("/api/v1/tags", tagRoutes);
app.use("/api/v1/referrals", referralRoutes);
app.use("/api/v1/rewards", rewardRoutes);
startLivePriceCron();
// app.use("/api/v1/webhooks", webhookRouter);
export default app;
