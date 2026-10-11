const { notify } = require('./notificationService');
const { sendWelcomeEmail } = require('./emailService');
const { TRIAL_DAYS } = require('./subscriptionService');

// Every new customer gets BOTH a welcome notification (in the app) and a
// welcome email. This must never throw or slow down registration, so each
// part is isolated: if the email provider is down, the in-app notification
// still arrives, and signup itself always succeeds.
async function welcomeNewUser(user) {
  const firstName = String(user.fullName || '').trim().split(/\s+/)[0] || 'there';

  try {
    await notify(user._id, {
      title: 'Welcome to BusinessHub',
      message: `Hi ${firstName}! Set up your business page to start your ${TRIAL_DAYS}-day free Pro trial.`,
      type: 'system',
      link: '/onboarding',
    });
  } catch (err) {
    console.error('[welcome] notification failed:', err.message);
  }

  try {
    const result = await sendWelcomeEmail(user, { trialDays: TRIAL_DAYS });
    if (!result || !result.sent) console.log(`[welcome] email not sent to ${user.email} (email is not configured)`);
  } catch (err) {
    console.error(`[welcome] email to ${user.email} failed:`, err.message);
  }
}

module.exports = { welcomeNewUser };
