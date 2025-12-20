"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const referral_controller_1 = require("../controller/referral.controller");
const router = (0, express_1.Router)();
router.post('/invite', referral_controller_1.inviteReferral);
router.get('/', referral_controller_1.getReferrals);
router.post('/accept', referral_controller_1.acceptReferral);
exports.default = router;
