"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const market_controller_1 = require("../controller/market.controller");
// Router Configuration
const marketRouter = (0, express_1.Router)();
const marketController = new market_controller_1.MarketController();
marketRouter.post("/", marketController.createMarket);
marketRouter.get("/", marketController.getMarkets);
marketRouter.get("/:id", marketController.getMarketById);
marketRouter.put("/:id", marketController.updateMarket);
marketRouter.delete("/:id", marketController.deleteMarket);
exports.default = marketRouter;
