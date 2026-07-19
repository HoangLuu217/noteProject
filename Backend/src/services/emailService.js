const nodemailer = require('nodemailer');
const path = require('path');

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

const getEmailTemplate = (title, contentHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #fbf9f1;
      font-family: 'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1b1c17;
    }
    .wrapper {
      width: 100%;
      background-color: #fbf9f1;
      padding: 40px 0;
    }
    .container {
      max-width: 440px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 36px;
      border: 2px solid rgba(0, 0, 0, 0.05);
      border-bottom: 6px solid rgba(0, 103, 128, 0.1);
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0, 103, 128, 0.06);
      text-align: center;
    }
    .logo-container {
      margin-bottom: 24px;
      display: inline-block;
      padding: 10px;
      background-color: #f5f4ec;
      border-radius: 20px;
      border: 1.5px solid rgba(0, 0, 0, 0.03);
    }
    .logo-img {
      height: 48px;
      max-width: 120px;
      display: block;
      margin: 0 auto;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
      color: #1b1c17;
    }
    p {
      font-size: 15px;
      line-height: 24px;
      color: #3d484d;
      margin-top: 0;
      margin-bottom: 24px;
      text-align: left;
    }
    .otp-code {
      display: inline-block;
      background-color: #f5f4ec;
      border-radius: 20px;
      border: 2.5px dashed #4cc9f0;
      padding: 14px 28px;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 6px;
      color: #006780;
      margin: 16px 0;
    }
    .btn {
      display: inline-block;
      background-color: #4cc9f0;
      color: #006780 !important;
      font-size: 16px;
      font-weight: 700;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 100px;
      border: 1.5px solid rgba(0, 0, 0, 0.05);
      border-bottom: 4px solid rgba(0, 103, 128, 0.2);
      box-shadow: 0 6px 16px rgba(0, 103, 128, 0.15);
      margin: 16px 0;
    }
    .footer {
      margin-top: 32px;
      border-top: 1px solid #f0eee6;
      padding-top: 24px;
      font-size: 12px;
      color: #6d797e;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="logo-container">
        <img class="logo-img" src="cid:app_logo" alt="ToDo App Logo" />
      </div>
      ${contentHtml}
      <div class="footer">
        © 2026 ToDo App. Bảo lưu mọi quyền.
      </div>
    </div>
  </div>
</body>
</html>
`;

const sendOtpEmail = async ({ email, code, fullName }) => {
  const subject = 'Mã xác thực đăng ký tài khoản ToDo';

  const contentHtml = `
    <h1>Mã xác thực đăng ký</h1>
    <p>Xin chào <strong>${fullName}</strong>,</p>
    <p>Cảm ơn bạn đã lựa chọn ứng dụng quản lý ghi chú <strong>ToDo</strong>. Mã OTP xác nhận đăng ký tài khoản của bạn là:</p>
    <div class="otp-code">${code}</div>
    <p>Mã này có hiệu lực trong vòng <strong>10 phút</strong>. Vì lý do bảo mật, tuyệt đối không chia sẻ mã này cho bất kỳ ai khác.</p>
  `;

  const html = getEmailTemplate('Xác thực đăng ký ToDo', contentHtml);
  const text = `Xin chào ${fullName},\n\nMã OTP đăng ký tài khoản ToDo của bạn là: ${code}\nMã có hiệu lực trong 10 phút.`;

  if (!isSmtpConfigured()) {
    console.log(`[OTP][dev] ${email}: ${code}`);
    return;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const iconPath = path.join(__dirname, '../assets/icon.png');

  await getTransporter().sendMail({
    from,
    to: email,
    subject,
    text,
    html,
    attachments: [{
      filename: 'icon.png',
      path: iconPath,
      cid: 'app_logo',
    }],
  });
};

const sendResetPasswordEmail = async ({ email, fullName, resetLink }) => {
  const subject = 'Yêu cầu đặt lại mật khẩu ToDo';

  const contentHtml = `
    <h1>Đặt lại mật khẩu</h1>
    <p>Xin chào,</p>
    <p>Vui lòng bấm vào nút bên dưới để đặt lại mật khẩu <strong>ToDo</strong> cho tài khoản email <strong>${email}</strong> của bạn:</p>
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 20px auto; border-collapse: separate;">
      <tr>
        <td align="center" valign="middle" bgcolor="#4cc9f0" style="border-radius: 100px; border: 1.5px solid rgba(0, 0, 0, 0.05); border-bottom: 4px solid rgba(0, 103, 128, 0.2); box-shadow: 0 6px 16px rgba(0, 103, 128, 0.15); background-color: #4cc9f0;">
          <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #006780 !important; font-family: 'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 700; text-decoration: none; border-radius: 100px; white-space: nowrap;">Đặt lại mật khẩu</a>
        </td>
      </tr>
    </table>
    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể bỏ qua email này.</p>
    <p>Cảm ơn bạn,<br>Đội ngũ ToDo</p>
  `;

  const html = getEmailTemplate('Đặt lại mật khẩu ToDo', contentHtml);
  const text = `Xin chào,\n\nVui lòng đặt lại mật khẩu ToDo cho tài khoản email ${email} của bạn bằng liên kết sau:\n${resetLink}\n\nNếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể bỏ qua email này.\n\nCảm ơn bạn,\nĐội ngũ ToDo`;

  if (!isSmtpConfigured()) {
    console.log(`[PasswordReset][dev] ${email}: ${resetLink}`);
    return;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const iconPath = path.join(__dirname, '../assets/icon.png');

  await getTransporter().sendMail({
    from,
    to: email,
    subject,
    text,
    html,
    attachments: [{
      filename: 'icon.png',
      path: iconPath,
      cid: 'app_logo',
    }],
  });
};

module.exports = {
  sendOtpEmail,
  sendResetPasswordEmail,
  isSmtpConfigured,
};
