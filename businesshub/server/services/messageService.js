const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');
const AdminMessage = require('../models/AdminMessage');
const { sendAdminMessageEmail } = require('./emailService');

const MAX_RECIPIENTS = 1000;
const AUDIENCES = ['all', 'trial', 'free', 'paid', 'not_onboarded', 'user'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const firstNameOf = (fullName) => String(fullName || '').trim().split(/\s+/)[0] || 'there';
const personalise = (text, firstName) => String(text).replace(/\{\{\s*firstName\s*\}\}/gi, firstName);

// Only active business owners are ever messaged in bulk.
const BASE = { role: 'owner', isActive: true };

async function usersForBusinesses(businessIds) {
  if (!businessIds.length) return [];
  return User.find({ ...BASE, business: { $in: businessIds } }).select('fullName email').lean();
}

// Turns an audience name into the list of people who will receive the message.
async function resolveRecipients(audience, { userEmail } = {}) {
  const now = Date.now();
  switch (audience) {
    case 'all':
      return User.find(BASE).select('fullName email').lean();
    case 'not_onboarded':
      return User.find({ ...BASE, onboardingComplete: false }).select('fullName email').lean();
    case 'trial': {
      const subs = await Subscription.find({ plan: 'free' }).select('business trialEndsAt').lean();
      return usersForBusinesses(subs.filter((s) => s.trialEndsAt && new Date(s.trialEndsAt) > now).map((s) => s.business));
    }
    case 'free': {
      const subs = await Subscription.find({ plan: 'free' }).select('business trialEndsAt').lean();
      return usersForBusinesses(subs.filter((s) => !s.trialEndsAt || new Date(s.trialEndsAt) <= now).map((s) => s.business));
    }
    case 'paid': {
      const subs = await Subscription.find({ plan: { $in: ['starter', 'pro'] }, status: 'active' }).select('business').lean();
      return usersForBusinesses(subs.map((s) => s.business));
    }
    case 'user': {
      const email = String(userEmail || '').trim().toLowerCase();
      if (!email) return [];
      const u = await User.findOne({ email, isActive: true }).select('fullName email').lean();
      return u ? [u] : [];
    }
    default:
      return [];
  }
}

// Sends the message one person at a time. Each email goes to ONE recipient
// (nobody ever sees anyone else's address), is spaced out to respect email
// provider limits, and a failure for one person never stops the others.
async function deliverMessage(msg, recipients) {
  const gap = Number(process.env.ADMIN_EMAIL_GAP_MS ?? 600);
  const counters = { emailSent: 0, emailFailed: 0, notificationsCreated: 0 };
  const save = (extra = {}) => AdminMessage.updateOne({ _id: msg._id }, { $set: { ...counters, ...extra } });

  for (let i = 0; i < recipients.length; i++) {
    const user = recipients[i];
    const first = firstNameOf(user.fullName);
    const subject = personalise(msg.subject, first);
    const body = personalise(msg.body, first);

    if (msg.channels.notification) {
      try {
        await Notification.create({
          user: user._id,
          title: subject,
          message: body, // stored in full, with line breaks, for the Notifications page
          type: 'system',
          link: msg.link || undefined,
        });
        counters.notificationsCreated++;
      } catch (err) {
        console.error(`[admin-message] notification for ${user.email} failed:`, err.message);
      }
    }

    if (msg.channels.email) {
      try {
        const result = await sendAdminMessageEmail(user.email, { subject, body, link: msg.link });
        if (result && result.sent) counters.emailSent++;
        else counters.emailFailed++;
      } catch (err) {
        counters.emailFailed++;
        console.error(`[admin-message] email to ${user.email} failed:`, err.message);
      }
      if (gap > 0 && i < recipients.length - 1) await sleep(gap);
    }

    if ((i + 1) % 10 === 0) await save();
  }
  await save({ status: 'done', finishedAt: new Date() });
}

module.exports = { resolveRecipients, deliverMessage, AUDIENCES, MAX_RECIPIENTS, personalise };
