const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/apiError');

// Ensures the logged-in user has completed onboarding and has a business
// attached, then loads it onto req.business for downstream handlers.
const requireBusiness = asyncHandler(async (req, res, next) => {
  if (!req.user.business) {
    throw new ApiError(400, 'Please complete your business onboarding first.');
  }
  req.businessId = req.user.business;
  next();
});

module.exports = requireBusiness;
