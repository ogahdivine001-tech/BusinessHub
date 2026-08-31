const ApiError = require('../utils/apiError');

const isConfigured = () => Boolean(process.env.PAYSTACK_SECRET_KEY);

// Initializes a Paystack transaction for a subscription upgrade.
// callback_url tells Paystack exactly where to redirect the customer back
// to after they complete (or cancel) payment on Paystack's hosted page —
// without it, Paystack falls back to a generic page and the user is stuck.
async function initializeTransaction({ email, amountKobo, metadata, callbackUrl }) {
  if (!isConfigured()) {
    throw new ApiError(
      503,
      'Payments are not configured yet. Add PAYSTACK_SECRET_KEY to the server .env.'
    );
  }
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, amount: amountKobo, metadata, callback_url: callbackUrl }),
  });
  if (!response.ok) {
    throw new ApiError(502, 'Could not start payment. Please try again.');
  }
  return response.json();
}

async function verifyTransaction(reference) {
  if (!isConfigured()) {
    throw new ApiError(503, 'Payments are not configured yet.');
  }
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  if (!response.ok) {
    throw new ApiError(502, 'Could not verify payment.');
  }
  return response.json();
}

module.exports = { initializeTransaction, verifyTransaction, isConfigured };
