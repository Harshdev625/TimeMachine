const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validateEmail, normalizeEmail, validatePassword } = require('../utils/validation');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS);

if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
if (!BCRYPT_ROUNDS || isNaN(BCRYPT_ROUNDS)) throw new Error('BCRYPT_ROUNDS environment variable is required and must be a number');

// Unified response helpers
function sendBadRequest(res, message) { return res.status(400).json({ error: message || 'Bad request' }); }
function sendUnauthorized(res, message) { return res.status(401).json({ error: message || 'Unauthorized' }); }
function issueToken(user) {
  return jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
}

router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!validateEmail(email)) return sendBadRequest(res, 'Invalid email format');
    if (!validatePassword(password)) return sendBadRequest(res, 'Password must be at least 6 characters long');
    
    const existingUser = await User.findOne({ email: normalizeEmail(email) });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = new User({
      email: normalizeEmail(email),
      password: hashedPassword,
      role: 'user',
      settings: {
        receiveReports: true,
        reportFrequency: 'weekly',
        categories: new Map()
      },
      lastActive: new Date()
    });
    
    await user.save();
    const token = issueToken(user);
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      email: user.email
    });
  } catch (error) {
    console.error('Sign up error:', error);
    res.status(500).json({ error: 'Server error during signup', details: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[LOGIN_HANDLER] incoming login for', email);
    
    if (!email || !password) {
      return sendBadRequest(res, 'Email and password are required');
    }
    
    const user = await User.findOne({ email: normalizeEmail(email) }).select('+password');
    if (!user || !await user.verifyPassword(password)) {
      return sendUnauthorized(res, 'Invalid email or password');
    }
    
    user.lastActive = new Date();
    await user.save();
    
    const token = issueToken(user);
    
    res.status(200).json({
      message: 'Login successful',
      token,
      email: user.email,
      user: {
        email: user.email,
        role: user.role,
        timezone: user.timezone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login', details: error.message });
  }
});

// Debug endpoint to list current User schema paths (dev only)
router.get('/debug-schema', async (req, res) => {
  try {
    const paths = Object.keys(User.schema.paths);
    res.json({ paths });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        message: 'Please login to access this resource'
      });
    }
    
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please login again'
      });
    }
    return res.status(403).json({ 
      error: 'Token invalid',
      code: 'INVALID_TOKEN',
      message: 'Your authentication is invalid. Please login again'
    });
  }
};

router.post('/verify', authenticateToken, (req, res) => {
  res.status(200).json({ 
    valid: true,
    user: req.user 
  });
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      user: {
        email: user.email,
        role: user.role,
        lastActive: user.lastActive,
        settings: user.settings,
        timezone: user.timezone
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.post('/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !validateEmail(email)) {
      return sendBadRequest(res, 'Valid email is required');
    }
    
    const user = await User.findOne({ email: normalizeEmail(email) }).select('+resetToken +resetTokenExpires');
    if (!user) {
      return res.status(200).json({ message: 'If an account exists, a reset link will be sent' });
    }
    
    const resetToken = uuidv4().replace(/-/g, '');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour
    
    user.resetToken = resetToken;
    user.resetTokenExpires = resetTokenExpires;
    await user.save();
    res.status(200).json({ message: 'Password reset link sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Server error during password reset request', details: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return sendBadRequest(res, 'Token and password are required');
    }
    
    if (!validatePassword(password)) {
      return sendBadRequest(res, 'Password must be at least 6 characters long');
    }
    
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() }
    }).select('+resetToken +resetTokenExpires +password');
    
    if (!user) {
      return sendBadRequest(res, 'Invalid or expired token');
    }
    
    user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Server error during password reset', details: error.message });
  }
});

router.post('/update-settings', authenticateToken, async (req, res) => {
  try {
    const { receiveReports, reportFrequency, categories } = req.body;
    
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (receiveReports !== undefined) {
      user.settings.receiveReports = receiveReports;
    }
    
    if (reportFrequency) {
      if (!['daily', 'weekly', 'monthly'].includes(reportFrequency)) {
        return sendBadRequest(res, 'Invalid report frequency');
      }
      user.settings.reportFrequency = reportFrequency;
    }
    
    if (categories && typeof categories === 'object') {
      user.settings.categories = new Map(Object.entries(categories));
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: user.settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const totalUsers = await User.countDocuments();
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: sevenDaysAgo }
    });
    
    const domainStats = await User.aggregate([
      { 
        $project: {
          domain: { $arrayElemAt: [{ $split: ['$email', '@'] }, 1] }
        }
      },
      { 
        $group: { 
          _id: '$domain', 
          count: { $sum: 1 } 
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      success: true,
      totalUsers,
      activeUsers,
      domainStats: domainStats.map(d => ({ 
        domain: d._id, 
        count: d.count 
      }))
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;