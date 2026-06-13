const mongoose = require('mongoose');

const emailOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ['register'],
      required: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'email_otps',
  }
);

emailOtpSchema.index({ email: 1, purpose: 1 }, { unique: true });

module.exports = mongoose.model('EmailOtp', emailOtpSchema);
