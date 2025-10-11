const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const moment = require('moment-timezone');
const { normalizeEmail } = require('../utils/validation');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isGoogleUser: {
    type: Boolean,
    default: false
  },  
  password: {
    type: String,
    required: function() { 
      return !this.isGoogleUser; 
    } ,
    select: false
  },
  resetToken: {
    type: String,
    select: false,
    index: true
  },
  resetTokenExpires: {
    type: Date,
    select: false
  },
  settings: {
    receiveReports: {
      type: Boolean,
      default: true
    },
    reportFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    categories: {
      type: Map,
      of: String,
      default: () => new Map()
    }
  },
  timezone: {
    name: {
      type: String,
      default: 'UTC',
      validate: {
        validator: value => value === 'UTC' || (typeof value === 'string' && moment.tz.zone(value) !== null),
        message: 'Invalid timezone name'
      }
    },
    offset: {
      type: Number,
      default: 0,
      validate: {
        validator: value => Number.isInteger(value) && value >= -720 && value <= 840,
        message: 'Invalid timezone offset; must be between -720 and 840 minutes'
      }
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'lastUpdated' }, strict: true });

userSchema.statics.findByEmail = async function(email) {
  if (!email) {
    throw new Error('Email is required');
  }
  return this.findOne({ email: normalizeEmail(email) }).lean();
};

userSchema.statics.createUser = async function(email, password, role = 'user') {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  const saltRounds = Number(process.env.BCRYPT_ROUNDS);
  if (!saltRounds || isNaN(saltRounds)) {
    throw new Error('BCRYPT_ROUNDS environment variable is required and must be a number');
  }
  
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  return this.create({
    email: normalizeEmail(email),
    password: hashedPassword,
    role,
    settings: {
      receiveReports: true,
      reportFrequency: 'weekly',
      categories: new Map()
    },
    timezone: {
      name: 'UTC',
      offset: 0,
      lastUpdated: new Date()
    },
    lastActive: new Date()
  });
};

userSchema.methods.verifyPassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.updateTimezone = async function(timezoneName, timezoneOffset) {
  const offset = Number(timezoneOffset);
  if (isNaN(offset) || offset < -720 || offset > 840) {
    throw new Error('Invalid timezone offset; must be between -720 and 840 minutes');
  }
  const name = (typeof timezoneName === 'string' && moment.tz.zone(timezoneName)) ? timezoneName : 'UTC';
  this.timezone = {
    name,
    offset,
    lastUpdated: new Date()
  };
  return this.save();
};

userSchema.methods.getCurrentDateInUserTimezone = function() {
  const now = new Date();
  const offset = Number(this.timezone.offset);
  if (isNaN(offset)) {
    console.warn(`Invalid timezone offset for user ${this.email}, defaulting to UTC`);
    return now.toISOString().split('T')[0];
  }
  const userTime = new Date(now.getTime() + (offset * 60000));
  return userTime.toISOString().split('T')[0];
};

userSchema.methods.isNewDayInUserTimezone = function(lastActivityDate) {
  const currentUserDate = this.getCurrentDateInUserTimezone();
  return currentUserDate !== lastActivityDate;
};

userSchema.statics.getUsersInTimezone = async function(timezoneOffset) {
  if (!Number.isInteger(timezoneOffset)) {
    throw new Error('Valid timezone offset is required');
  }
  return this.find({ 'timezone.offset': timezoneOffset }).lean();
};

module.exports = mongoose.model('User', userSchema);