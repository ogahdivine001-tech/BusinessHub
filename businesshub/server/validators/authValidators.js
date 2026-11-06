const { body } = require('express-validator');

const registerRules = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('accountType').optional().isIn(['seller', 'buyer']).withMessage('Account type must be seller or buyer'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
];

const loginRules = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordRules = [
  body('email')
    .isEmail()
    .withMessage('A valid email is required')
    .normalizeEmail(),
];

const resetPasswordRules = [
  body('token').isString().trim().notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

const verifyEmailRules = [
  body('token').isString().trim().matches(/^[a-f0-9]{64}$/).withMessage('Verification link is invalid or has expired.'),
];

module.exports = { registerRules, loginRules, forgotPasswordRules, resetPasswordRules, verifyEmailRules };
