const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const ApiError = require('../utils/apiError');

// Accepts a base64 data URI (from the frontend) and uploads it to Cloudinary
// under a folder scoped to the business, e.g. businesshub/products/<id>.
const ALLOWED_IMAGE = /^data:image\/(png|jpe?g|webp|gif|avif|heic|heif);base64,/i;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Rejects anything that is not a normal photo (for example SVG or HTML
// disguised as an image) and anything too large, before it leaves the server.
function assertSafeImage(dataUri) {
  if (typeof dataUri !== 'string' || !ALLOWED_IMAGE.test(dataUri)) {
    throw new ApiError(400, 'Please upload a PNG, JPG, WebP, GIF or AVIF image.');
  }
  const bytes = Math.floor(((dataUri.length - dataUri.indexOf(',') - 1) * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) throw new ApiError(400, 'That image is too large. Please use one under 8 MB.');
}

async function uploadImage(base64DataUri, folder) {
  assertSafeImage(base64DataUri);
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

module.exports = { uploadImage, deleteImage, assertSafeImage };
