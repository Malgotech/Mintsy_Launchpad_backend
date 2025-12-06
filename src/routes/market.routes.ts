import { Router } from "express";
import { MarketController } from "../controller/market.controller";

// Router Configuration
const marketRouter = Router();
const marketController = new MarketController();
marketRouter.post("/", marketController.createMarket);
marketRouter.get("/", marketController.getMarkets);
marketRouter.get("/:id", marketController.getMarketById);
marketRouter.put("/:id", marketController.updateMarket);
marketRouter.delete("/:id", marketController.deleteMarket);

export default marketRouter;
