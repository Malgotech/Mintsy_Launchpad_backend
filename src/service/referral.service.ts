import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { sendReferralInviteEmail } from '../utils/emailService';

export class ReferralService {
  // Invite a user by email
  async inviteReferral(referrerAccount: string, referredEmail: string) {
    // Check if referral already exists
    const existing = await prisma.referral.findFirst({
      where: { referrerAccount, referredEmail }
    });
    if (existing) return existing;

    // Create referral
    const referral = await prisma.referral.create({
      data: {
        referrerAccount,
        referredEmail,
        status: 'PENDING',
      },
    });

    // Send invite email
    await sendReferralInviteEmail(referredEmail, referrerAccount);

    return referral;
  }

  // Accept a referral (when a new user signs up with a referral code)
  async acceptReferral(referralCode: string, referredAccount: string ,buyAmount?: number,currency?: string, amount?: number) {
    // Find the referral by code (referrerAccount)
    const referral = await prisma.referral.findFirst({
      where: { referrerAccount: referralCode, referredAccount: null },
    });
    if (!referral) throw new Error('Invalid or already used referral code');

    // Update referral as completed and link referred user
    const updated = await prisma.referral.update({
      where: { id: referral.id },
      data: {
        referredAccount,
        status: 'COMPLETED',
      },
    });

    if(buyAmount!>0.1*10**9){
      await prisma.reward.create({
        data: {
          referralId: referral.id,
          amount: amount!, // Hardcoded reward amount
          currency: currency!,
          status: 'CREDITED',
        },
      });
    }

    // Create a reward for the referrer
    await prisma.reward.create({
      data: {
        referralId: referral.id,
        amount: 0, // Hardcoded reward amount
        currency: `${currency}`,
        status: 'PENDING',
      },
    });

    return updated;
  }

  // Reward a referral (manual reward creation)
  async rewardReferral(referralId: string, amount: number, currency: string) {
    // Optionally: check if referral exists and is eligible for reward
    const referral = await prisma.referral.findUnique({ where: { id: referralId } });
    if (!referral) throw new Error('Referral not found');
    // Create a reward for the referrer
    const reward = await prisma.reward.create({
      data: {
        referralId,
        amount,
        currency,
        status: 'CREDITED',
      },
    });
    return reward;
  }

  // Get all referrals for a user (as referrer or referred)
  async getReferralsForUser(userAccount: string) {
    return prisma.referral.findMany({
      where: {
        OR: [
          { referrerAccount: userAccount },
          { referredAccount: userAccount },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const referralService = new ReferralService(); 