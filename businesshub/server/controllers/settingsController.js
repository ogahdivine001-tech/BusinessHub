const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { uploadImage } = require('../services/uploadService');

const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { fullName, phone },
    { new: true, runValidators: true }
  );
  res.json({ success: true, data: { user: user.toSafeObject() } });
});

const updateAvatar = asyncHandler(async (req, res) => {
  const { image } = req.body;
  const uploaded = await uploadImage(image, `avatars/${req.user._id}`);
  const user = await User.findByIdAndUpdate(req.user._id, { avatar: uploaded }, { new: true });
  res.json({ success: true, data: { user: user.toSafeObject() } });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, 'Current password is incorrect.');
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated.' });
});

module.exports = { updateProfile, updateAvatar, changePassword };
