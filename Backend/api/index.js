const app = require('../src/app');
const connectDB = require('../src/config/db');
const initializeFirebaseAdmin = require('../src/config/firebase');

let isConnected = false;

module.exports = async (req, res) => {
  if (!isConnected) {
    await connectDB();
    try {
      initializeFirebaseAdmin();
    } catch (e) {
      console.log('Firebase init note:', e.message);
    }
    isConnected = true;
  }
  return app(req, res);
};
