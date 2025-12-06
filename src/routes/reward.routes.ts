import { Router } from 'express';
import { getRewards, withdrawRewards } from '../controller/reward.controller';

const router = Router();

router.get('/', getRewards);
router.post('/withdraw', withdrawRewards);

export default router; 