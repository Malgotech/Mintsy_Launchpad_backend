import { Router } from "express";
import { TradeController } from "../controller/trade.controller";

const tradeRouter = Router();
const tradeController = new TradeController();

tradeRouter.post("/", tradeController.placeOrder);
tradeRouter.get("/", tradeController.getTradeHistory);
tradeRouter.get("/daily-volume", tradeController.getDailyVolume);
// 

export default tradeRouter;