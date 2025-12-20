"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardService = exports.RewardService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class RewardService {
    // Get all rewards for a user (credited to them via referrals)
    async getRewardsForUser(userAccount) {
        // Find all rewards where the referral's referrerAccount matches
        return prisma.reward.findMany({
            where: {
                referral: {
                    referrerAccount: userAccount,
                },
            },
            orderBy: { createdAt: 'desc' },
            include: { referral: true },
        });
    }
    // Withdraw rewards (dummy implementation)
    async withdrawRewards(userAccount, amount) {
        // In a real app, check available credited rewards, mark as withdrawn, etc.
        // Here, just return a dummy response
        return { success: true, withdrawn: amount, userAccount };
    }
}
exports.RewardService = RewardService;
exports.rewardService = new RewardService();
