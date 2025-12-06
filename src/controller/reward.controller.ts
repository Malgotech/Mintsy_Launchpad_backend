import { Request, Response } from 'express';
import { rewardService } from '../service/reward.service';

export const getRewards = async (req: Request, res: Response) => {
  try {
    const userAccount = req.query.userAccount as string;
    if (!userAccount) {
      return res.status(400).json({ error: 'userAccount query parameter is required' });
    }
    const rewards = await rewardService.getRewardsForUser(userAccount);
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
};

export const withdrawRewards = async (req: Request, res: Response) => {
  try {
    const { userAccount, amount } = req.body;
    if (!userAccount || typeof amount !== 'number') {
      return res.status(400).json({ error: 'userAccount and amount are required' });
    }
    const result = await rewardService.withdrawRewards(userAccount, amount);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}; 