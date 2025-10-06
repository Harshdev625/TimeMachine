const express = require('express');
const router = express.Router();
const { sendMail } = require('../utils/resendMailer');
const { authenticateToken } = require('./auth');
const User = require('../models/User');

router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    if (!to || !subject || !message) 
      return res.status(400).json({ error: 'to, subject and message are required' });
    const result = await sendMail(to, subject, message);
    if (!result.success) 
      return res.status(500).json({ error: result.error || 'Failed to send email' });

    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error('/mail/send error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
