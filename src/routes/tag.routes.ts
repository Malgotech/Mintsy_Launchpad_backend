import { Router } from "express";
import { TagController } from "../controller/tag.controller";

const router = Router();
const tagController = new TagController();

// Get all tags
router.get("/", tagController.getAllTags);

// Get popular tags
router.get("/popular", tagController.getPopularTags);

// Create a new tag
router.post("/", tagController.createTag);

export default router; 