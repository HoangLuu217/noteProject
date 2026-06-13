const { v2: cloudinary } = require('cloudinary');

let configured = false;

const initializeCloudinary = () => {
  if (configured) return cloudinary;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    const error = new Error('Cloudinary is not configured');
    error.statusCode = 500;
    throw error;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  configured = true;
  return cloudinary;
};

module.exports = initializeCloudinary;
