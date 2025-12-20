"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reward_controller_1 = require("../controller/reward.controller");
const router = (0, express_1.Router)();
router.get('/', reward_controller_1.getRewards);
router.post('/withdraw', reward_controller_1.withdrawRewards);
exports.default = router;
