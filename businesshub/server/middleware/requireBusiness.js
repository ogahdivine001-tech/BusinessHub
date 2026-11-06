const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/apiError');

// Ensures the logged-in user has completed onboarding and has a business
// attached, then loads it onto req.business for downstream handlers.
const requireBusiness = asyncHandler(async (req, res, next) => {
  // Buyer accounts can never reach seller tools, whatever the request says.
  if (req.user.role === 'buyer') {
    throw new ApiError(403, 'This area is for business accounts.');
  }
  if (!req.user.business) {
    throw new ApiError(400, 'Please complete your business onboarding first.');
  }
  req.businessId = req.user.business;
  next();
});

module.exports = requireBusiness;
