import express from 'express';
import userRoutes from './user.routes';
import tokenRoutes from './token.routes';
import tradeRoutes from './trade.routes';
import { createBanner, getBanner } from '../controller/banner.controller';
import threadRoutes from './thread.routes';
import advanceRoutes from './advance.routes';
import watchlistRoutes from './watchlist.routes';
import adminRoutes from './admin.routes';
import livekitRoutes from './livekit.routes';
import tagRoutes from './tag.routes';
import referralRoutes from './referral.routes';
import rewardRoutes from './reward.routes';

const router = express.Router();

router.use('/user', userRoutes);
router.use('/token', tokenRoutes);
router.use('/trade', tradeRoutes);
router.use('/threads', threadRoutes);
router.use('/advance', advanceRoutes);
router.use('/watchlist', watchlistRoutes);
router.use('/admin', adminRoutes);
router.use('/livekit', livekitRoutes);
router.use('/tags', tagRoutes);
router.use('/referrals', referralRoutes);
router.use('/rewards', rewardRoutes);
router.get('/banner​',getBanner);
router.post('/banner', createBanner);

export default router;
