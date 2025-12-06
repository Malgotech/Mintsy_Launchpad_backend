import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendReferralInviteEmail(to: string, referrerAccount: string) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'no-reply@example.com',
    to,
    subject: 'You have been invited! 🎉',
    text: `You have been invited to join by https://mintsy.fun?ReferralCode=${referrerAccount}. Use their referral code when signing up!`,
    html: `<p>You have been invited to join by <a href="https://mintsy.fun?ReferralCode=${referrerAccount}">https://mintsy.fun?ReferralCode=${referrerAccount}</a>.<br/>Use their referral code when signing up!</p>`,
  };
  await transporter.sendMail(mailOptions);
} 