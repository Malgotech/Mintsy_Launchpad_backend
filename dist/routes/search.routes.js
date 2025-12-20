"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const search_controller_1 = require("../controller/search.controller");
const searchRouter = (0, express_1.Router)();
const searchController = new search_controller_1.SearchController();
searchRouter.get("/", searchController.search);
exports.default = searchRouter;
