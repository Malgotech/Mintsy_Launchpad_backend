import { Router } from "express";
import { TokenController } from "../controller/token.controller";

const tokenRouter = Router();
const tokenController = new TokenController();

tokenRouter.get("/", tokenController.getTokens);
tokenRouter.get("/live", tokenController.getLiveTokens);
tokenRouter.post("/", tokenController.createToken);
tokenRouter.get("/:id", tokenController.getTokenById);
tokenRouter.get("/details/:symbol", tokenController.getCoinDetails);

tokenRouter.put("/:id", tokenController.updateToken);
tokenRouter.put("/progress/:id", tokenController.updateTokenProgress);
tokenRouter.put("/lp-status/:id", tokenController.updateLpStatus);

tokenRouter.get("/:id/holders", tokenController.getTokenHolders);
tokenRouter.get("/:coinId/top-holders", tokenController.getTopHoldersByCoinId);
tokenRouter.post("/:coinId/similar", tokenController.getSimilarCoins);
tokenRouter.get("/tag/:tagId", tokenController.getTokensByTag);

tokenRouter.post(
  "/updateGraduationStatus",
  tokenController.updateGraduationStatus
);

export default tokenRouter;
