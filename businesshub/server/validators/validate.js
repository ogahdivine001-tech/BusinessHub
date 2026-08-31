const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

// Runs after express-validator chains; turns validation errors into a
// consistent 400 ApiError instead of leaking express-validator's shape.
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map((e) => e.msg).join(', ');
    return next(new ApiError(400, message));
  }
  next();
};

module.exports = validate;
