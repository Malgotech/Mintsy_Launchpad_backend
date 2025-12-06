import { Router } from "express";
import { SearchController } from "../controller/search.controller";

const searchRouter = Router();
const searchController = new SearchController();

searchRouter.get("/", searchController.search);

export default searchRouter;