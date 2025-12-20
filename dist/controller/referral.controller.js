"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardReferral = exports.getReferrals = exports.acceptReferral = exports.inviteReferral = void 0;
const referral_service_1 = require("../service/referral.service");
/**
 * Invite a user by email or generate a referral link
 * POST /referral/invite
 * Body: { referrerAccount: string, email?: string }
 */
const inviteReferral = async (req, res) => {
    try {
        const { referrerAccount, email } = req.body;
        if (!referrerAccount) {
            return res.status(400).json({ error: 'referrerAccount is required' });
        }
        const result = await referral_service_1.referralService.inviteReferral(referrerAccount, email);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
};
exports.inviteReferral = inviteReferral;
/**
 * Accept a referral using a referral code (on signup)
 * POST /referral/accept
 * Body: { referralCode: string, referredAccount: string }
 */
const acceptReferral = async (req, res) => {
    try {
        const { referralCode, referredAccount } = req.body;
        if (!referralCode || !referredAccount) {
            return res.status(400).json({ error: 'referralCode and referredAccount are required' });
        }
        const result = await referral_service_1.referralService.acceptReferral(referralCode, referredAccount);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
};
exports.acceptReferral = acceptReferral;
/**
 * List all referrals for a user
 * GET /referral/list?userAccount=...
 */
const getReferrals = async (req, res) => {
    try {
        const userAccount = req.query.userAccount;
        if (!userAccount) {
            return res.status(400).json({ error: 'userAccount query parameter is required' });
        }
        const referrals = await referral_service_1.referralService.getReferralsForUser(userAccount);
        res.json(referrals);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
};
exports.getReferrals = getReferrals;
/**
 * Reward a referral after a qualifying purchase
 * POST /referral/reward
 * Body: { referredAccount: string, purchaseAmount: number, currency: string }
 * This endpoint should be called by the payment/trade system after a purchase.
 */
const rewardReferral = async (req, res) => {
    try {
        const { referredAccount, purchaseAmount, currency } = req.body;
        if (!referredAccount || !purchaseAmount || !currency) {
            return res.status(400).json({ error: 'referredAccount, purchaseAmount, and currency are required' });
        }
        const result = await referral_service_1.referralService.rewardReferral(referredAccount, purchaseAmount, currency);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
};
exports.rewardReferral = rewardReferral;
