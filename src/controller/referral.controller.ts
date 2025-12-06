import { Request, Response } from 'express';
import { referralService } from '../service/referral.service';

/**
 * Invite a user by email or generate a referral link
 * POST /referral/invite
 * Body: { referrerAccount: string, email?: string }
 */
export const inviteReferral = async (req: Request, res: Response) => {
  try {
    const { referrerAccount, email } = req.body;
    if (!referrerAccount) {
      return res.status(400).json({ error: 'referrerAccount is required' });
    }
    const result = await referralService.inviteReferral(referrerAccount, email);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
};

/**
 * Accept a referral using a referral code (on signup)
 * POST /referral/accept
 * Body: { referralCode: string, referredAccount: string }
 */
export const acceptReferral = async (req: Request, res: Response) => {
  try {
    const { referralCode, referredAccount } = req.body;
    if (!referralCode || !referredAccount) {
      return res.status(400).json({ error: 'referralCode and referredAccount are required' });
    }
    const result = await referralService.acceptReferral(referralCode, referredAccount);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
};

/**
 * List all referrals for a user
 * GET /referral/list?userAccount=...
 */
export const getReferrals = async (req: Request, res: Response) => {
  try {
    const userAccount = req.query.userAccount as string;
    if (!userAccount) {
      return res.status(400).json({ error: 'userAccount query parameter is required' });
    }
    const referrals = await referralService.getReferralsForUser(userAccount);
    res.json(referrals);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
};

/**
 * Reward a referral after a qualifying purchase
 * POST /referral/reward
 * Body: { referredAccount: string, purchaseAmount: number, currency: string }
 * This endpoint should be called by the payment/trade system after a purchase.
 */
export const rewardReferral = async (req: Request, res: Response) => {
  try {
    const { referredAccount, purchaseAmount, currency } = req.body;
    if (!referredAccount || !purchaseAmount || !currency) {
      return res.status(400).json({ error: 'referredAccount, purchaseAmount, and currency are required' });
    }
    const result = await referralService.rewardReferral(referredAccount, purchaseAmount, currency);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
};

