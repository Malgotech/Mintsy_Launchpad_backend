"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const admin_controller_1 = require("../controller/admin.controller");
const router = express_1.default.Router();
const adminController = new admin_controller_1.AdminController();
// Get token statistics for admin dashboard
router.get("/stats", adminController.getTokenStats);
// Get all tokens for admin (without pagination)
router.get("/tokens/all", adminController.getAllTokens);
// Get detailed token list with pagination and filters
router.get("/tokens", adminController.getTokenList);
// Update token status (feature, blacklist, flag, etc.)
router.patch("/tokens/:id", adminController.updateTokenStatus);
// Get user activity statistics
router.get("/users/activity-stats", adminController.getUserActivityStats);
// Get analytics data for admin dashboard
router.get("/analytics", adminController.getAnalytics);
// Admin action routes
router.post("/update-state", adminController.updateState);
router.post("/update-market", adminController.updateMarket);
router.post("/withdraw", adminController.withdraw);
router.post("/update-reward-status", adminController.updateRewardStatus);
exports.default = router;
