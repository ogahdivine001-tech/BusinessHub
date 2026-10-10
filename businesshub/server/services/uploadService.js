const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const ApiError = require('../utils/apiError');

// Accepts a base64 data URI (from the frontend) and uploads it to Cloudinary
// under a folder scoped to the business, e.g. businesshub/products/<id>.
async function uploadImage(base64DataUri, folder) {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(
      503,
      'Image uploads are not configured yet. Add Cloudinary credentials to the server .env.'
    );
  }
  const result = await cloudinary.uploader.upload(base64DataUri, {
    folder: `businesshub/${folder}`,
    resource_type: 'image',
  });
  return { url: result.secure_url, publicId: result.public_id };
}

async function deleteImage(publicId) {
  if (!publicId || !isCloudinaryConfigured()) return;
  await cloudinary.uploader.destroy(publicId);
}

module.exports = { uploadImage, deleteImage };
