const bcrypt = require('bcryptjs');

const hashOtp = async (code) => bcrypt.hash(String(code), 10);

const compareOtp = async (code, hash) => bcrypt.compare(String(code), hash);

module.exports = {
  hashOtp,
  compareOtp,
};
