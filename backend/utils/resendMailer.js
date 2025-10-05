const { Resend } = require('resend');

if (!process.env.RESEND_KEY) {
  console.warn('RESEND_KEY not set; resendMailer will not be able to send emails.');
}

const resend = process.env.RESEND_KEY ? new Resend(process.env.RESEND_KEY) : null;

/**
 * Send an email using Resend
 * @param {string|string[]} to - recipient(s)
 * @param {string} subject - email subject
 * @param {string} message - html or plain text body
 * @returns {Promise<object>} - { success: boolean, data?: any, error?: string }
 */
async function sendMail(to, subject, message) {
  try {
    if (!resend || !process.env.RESEND_MAIL) {
      throw new Error('RESEND_KEY or RESEND_MAIL not configured');
    }

    const data = await resend.emails.send({
      from: process.env.RESEND_MAIL,
      to,
      subject,
      html: message
    });

    return { success: true, data };
  } catch (err) {
    console.error('resendMailer sendMail error:', err);
    return { success: false, error: err.message || String(err) };
  }
}

module.exports = { sendMail };
