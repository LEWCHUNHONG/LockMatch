// utils/helpers.js
const path = require('path');

const BASE_URL = process.env.BASE_URL;

const buildAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;
  return `${BASE_URL}/uploads/avatars/${path.basename(avatarPath)}`;
};

module.exports = { buildAvatarUrl };