const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const connectDB = require('../config/db');
const { User } = require('../model');

const generate = async () => {
  await connectDB();

  let user = await User.findOne({ email: 'testuser@example.com' });
  if (!user) {
    user = await User.create({
      email: 'testuser@example.com',
      fullName: 'Test User',
      avatar: 'https://example.com/avatar.png',
      firebaseUid: 'test-firebase-uid-' + Date.now(),
      authProvider: 'firebase',
      isEmailVerified: true,
      lastLoginAt: new Date(),
    });
    console.log('Created test user:', user.email);
  } else {
    console.log('Found existing test user:', user.email);
  }

  const payload = {
    userId: user._id.toString(),
    email: user.email,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '365d',
  });

  console.log('\n======================================');
  console.log('YOUR TEST BEARER ACCESS TOKEN:');
  console.log('======================================\n');
  console.log(token);
  console.log('\n======================================\n');

  await mongoose.disconnect();
};

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
