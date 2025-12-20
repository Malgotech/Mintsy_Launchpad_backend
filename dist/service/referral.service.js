"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.referralService = exports.ReferralService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const emailService_1 = require("../utils/emailService");
class ReferralService {
    // Invite a user by email
    async inviteReferral(referrerAccount, referredEmail) {
        // Check if referral already exists
        const existing = await prisma.referral.findFirst({
            where: { referrerAccount, referredEmail }
        });
        if (existing)
            return existing;
        // Create referral
        const referral = await prisma.referral.create({
            data: {
                referrerAccount,
                referredEmail,
                status: 'PENDING',
            },
        });
        // Send invite email
        await (0, emailService_1.sendReferralInviteEmail)(referredEmail, referrerAccount);
        return referral;
    }
    // Accept a referral (when a new user signs up with a referral code)
    async acceptReferral(referralCode, referredAccount, buyAmount, currency, amount) {
        // Find the referral by code (referrerAccount)
        const referral = await prisma.referral.findFirst({
            where: { referrerAccount: referralCode, referredAccount: null },
        });
        if (!referral)
            throw new Error('Invalid or already used referral code');
        // Update referral as completed and link referred user
        const updated = await prisma.referral.update({
            where: { id: referral.id },
            data: {
                referredAccount,
                status: 'COMPLETED',
            },
        });
        if (buyAmount > 0.1 * 10 ** 9) {
            await prisma.reward.create({
                data: {
                    referralId: referral.id,
                    amount: amount, // Hardcoded reward amount
                    currency: currency,
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
    async rewardReferral(referralId, amount, currency) {
        // Optionally: check if referral exists and is eligible for reward
        const referral = await prisma.referral.findUnique({ where: { id: referralId } });
        if (!referral)
            throw new Error('Referral not found');
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
    async getReferralsForUser(userAccount) {
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
exports.ReferralService = ReferralService;
exports.referralService = new ReferralService();
