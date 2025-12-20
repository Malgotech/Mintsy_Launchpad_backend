"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tag_controller_1 = require("../controller/tag.controller");
const router = (0, express_1.Router)();
const tagController = new tag_controller_1.TagController();
// Get all tags
router.get("/", tagController.getAllTags);
// Get popular tags
router.get("/popular", tagController.getPopularTags);
// Create a new tag
router.post("/", tagController.createTag);
exports.default = router;
