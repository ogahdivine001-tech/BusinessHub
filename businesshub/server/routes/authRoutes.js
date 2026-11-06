const express = require('express');
const { protect } = require('../middleware/auth');
const { authLimiter, verifyEmailLimiter } = require('../middleware/rateLimiter');
const validate = require('../validators/validate');
const {
  registerRules, loginRules, forgotPasswordRules, resetPasswordRules, verifyEmailRules,
} = require('../validators/authValidators');
const ctrl = require('../controllers/authController');

const router = express.Router();

router.post('/register', authLimiter, registerRules, validate, ctrl.register);
router.post('/login', authLimiter, loginRules, validate, ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', protect, ctrl.getMe);
router.post('/forgot-password', authLimiter, forgotPasswordRules, validate, ctrl.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordRules, validate, ctrl.resetPassword);
router.post('/become-seller', protect, authLimiter, ctrl.becomeSeller);
router.post('/verify-email/request', protect, verifyEmailLimiter, ctrl.requestEmailVerification);
router.post('/verify-email', authLimiter, verifyEmailRules, validate, ctrl.verifyEmail);

module.exports = router;
