import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class RewardService {
  // Get all rewards for a user (credited to them via referrals)
  async getRewardsForUser(userAccount: string) {
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
  async withdrawRewards(userAccount: string, amount: number) {
    // In a real app, check available credited rewards, mark as withdrawn, etc.
    // Here, just return a dummy response
    return { success: true, withdrawn: amount, userAccount };
  }
}

export const rewardService = new RewardService(); 