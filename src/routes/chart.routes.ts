import { Router } from "express";
import { ChartController } from "../controller/chart.controller";

const chartRouter = Router();
const chartController = new ChartController();

chartRouter.get("/:coinId", chartController.getCoinChartData);

export default chartRouter;
