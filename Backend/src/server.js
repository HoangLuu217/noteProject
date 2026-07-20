const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const jwt = require('jsonwebtoken');
const User = require('./model/User');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  try {
    const user = await User.findOne({ email: 'testemaild086@gmail.com' });
    if (user) {
      const token = jwt.sign({ userId: user._id.toString(), email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
      console.log("\n==================== CHUỖI TOKEN CỦA BẠN ĐỂ TEST POSTMAN ====================");
      console.log(token);
      console.log("==============================================================================\n");
    }
  } catch (err) {
    console.log("Could not generate test token on startup:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};
const initializeFirebaseAdmin = require('./config/firebase');

try {
  initializeFirebaseAdmin();
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Firebase Admin error:', error.message);
}
startServer();
