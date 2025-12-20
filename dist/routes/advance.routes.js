"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const advance_controller_1 = require("../controller/advance.controller");
const router = (0, express_1.Router)();
const advanceController = new advance_controller_1.AdvanceController();
// Get all columns and their cards
router.get('/columns', (req, res) => advanceController.getColumns(req, res));
// Add more endpoints as needed, e.g. create column, update card, etc.
// Example placeholder endpoints (uncomment and implement in controller if needed):
// router.post('/columns', (req, res) => advanceController.createColumn(req, res));
// router.put('/cards/:id', (req, res) => advanceController.updateCard(req, res));
// router.delete('/cards/:id', (req, res) => advanceController.deleteCard(req, res));
exports.default = router;
