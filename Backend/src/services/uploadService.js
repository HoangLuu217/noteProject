const initializeCloudinary = require('../config/cloudinary');

const uploadAvatar = async (file, userId) => {
  const cloudinary = initializeCloudinary();
  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'noteapp/avatars',
    public_id: `user_${userId}_${Date.now()}`,
    overwrite: true,
    transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};

module.exports = {
  uploadAvatar,
};
