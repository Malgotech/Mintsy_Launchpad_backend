"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const trade_controller_1 = require("../controller/trade.controller");
const tradeRouter = (0, express_1.Router)();
const tradeController = new trade_controller_1.TradeController();
tradeRouter.post("/", tradeController.placeOrder);
tradeRouter.get("/", tradeController.getTradeHistory);
tradeRouter.get("/daily-volume", tradeController.getDailyVolume);
// 
exports.default = tradeRouter;
