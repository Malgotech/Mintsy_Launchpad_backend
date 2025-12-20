"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReferralInviteEmail = sendReferralInviteEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
async function sendReferralInviteEmail(to, referrerAccount) {
    const mailOptions = {
        from: process.env.SMTP_FROM || 'no-reply@example.com',
        to,
        subject: 'You have been invited! 🎉',
        text: `You have been invited to join by https://mintsy.fun?ReferralCode=${referrerAccount}. Use their referral code when signing up!`,
        html: `<p>You have been invited to join by <a href="https://mintsy.fun?ReferralCode=${referrerAccount}">https://mintsy.fun?ReferralCode=${referrerAccount}</a>.<br/>Use their referral code when signing up!</p>`,
    };
    await transporter.sendMail(mailOptions);
}
