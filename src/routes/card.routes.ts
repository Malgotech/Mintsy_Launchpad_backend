import { Router } from "express";
import { CardController } from "../controller/card.controller";

const cardRouter = Router();
const cardController = new CardController();

cardRouter.get("/trending", cardController.getTrendingCards);
cardRouter.get("/alpha-spot", cardController.getAlphaSpot);
cardRouter.get("/featured", cardController.getFeaturedCards);
cardRouter.get("/filtered", cardController.getFilteredTokens);
cardRouter.post("/hide", cardController.hideCard);
cardRouter.get("/hidden", cardController.getHiddenCards);
cardRouter.post("/unhide", cardController.unhideCard);

export default cardRouter;