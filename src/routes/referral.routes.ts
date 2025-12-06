import { Router } from 'express';
import { inviteReferral, getReferrals, acceptReferral } from '../controller/referral.controller';

const router = Router();

router.post('/invite', inviteReferral);
router.get('/', getReferrals);
router.post('/accept', acceptReferral);

export default router; 