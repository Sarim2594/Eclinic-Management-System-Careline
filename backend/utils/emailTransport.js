const nodemailer = require('nodemailer');

function createTransport() {
  const port = Number(process.env.EMAIL_PORT || 587);

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

function isEmailConfigured() {
  return Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

async function sendAppEmail(payload) {
  if (!isEmailConfigured()) {
    const error = new Error('Email is not configured on the server');
    error.status = 503;
    throw error;
  }

  const transporter = createTransport();
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    ...payload,
  });
}

module.exports = {
  sendAppEmail,
  isEmailConfigured,
};
