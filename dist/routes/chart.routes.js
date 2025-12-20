"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chart_controller_1 = require("../controller/chart.controller");
const chartRouter = (0, express_1.Router)();
const chartController = new chart_controller_1.ChartController();
chartRouter.get("/:coinId", chartController.getCoinChartData);
exports.default = chartRouter;
