"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdrawRewards = exports.getRewards = void 0;
const reward_service_1 = require("../service/reward.service");
const getRewards = async (req, res) => {
    try {
        const userAccount = req.query.userAccount;
        if (!userAccount) {
            return res.status(400).json({ error: 'userAccount query parameter is required' });
        }
        const rewards = await reward_service_1.rewardService.getRewardsForUser(userAccount);
        res.json(rewards);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
};
exports.getRewards = getRewards;
const withdrawRewards = async (req, res) => {
    try {
        const { userAccount, amount } = req.body;
        if (!userAccount || typeof amount !== 'number') {
            return res.status(400).json({ error: 'userAccount and amount are required' });
        }
        const result = await reward_service_1.rewardService.withdrawRewards(userAccount, amount);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
};
exports.withdrawRewards = withdrawRewards;
