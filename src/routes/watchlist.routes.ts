import { Router } from "express";
import { WatchlistController } from "../controller/watchlist.controller";

const watchlistRouter = Router();
const watchlistController = new WatchlistController();

watchlistRouter.post("/add", watchlistController.addToWatchlist);
watchlistRouter.post("/remove", watchlistController.removeFromWatchlist);
watchlistRouter.post("/create", watchlistController.createWatchlist);
watchlistRouter.get("/:userId", watchlistController.getUserLists);

export default watchlistRouter;