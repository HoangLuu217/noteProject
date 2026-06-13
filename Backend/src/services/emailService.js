const nodemailer = require('nodemailer');

const isSmtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const sendOtpEmail = async ({ email, code, fullName }) => {
  const subject = 'Ma xac thuc dang ky NoteApp';
  const text = [
    `Xin chao ${fullName},`,
    '',
    `Ma OTP dang ky tai khoan NoteApp cua ban la: ${code}`,
    'Ma co hieu luc trong 10 phut.',
    '',
    'Neu ban khong yeu cau dang ky, hay bo qua email nay.',
  ].join('\n');

  if (!isSmtpConfigured()) {
    console.log(`[OTP][dev] ${email}: ${code}`);
    return;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await getTransporter().sendMail({
    from,
    to: email,
    subject,
    text,
  });
};

module.exports = {
  sendOtpEmail,
  isSmtpConfigured,
};
