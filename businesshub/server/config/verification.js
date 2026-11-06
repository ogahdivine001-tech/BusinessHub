// Verification fee configuration. Nothing here is hardcoded on purpose: the
// amount and currency are business decisions that must be confirmed before a
// real payment is ever taken. Until BOTH are set, paid verification stays off.
//
//   VERIFICATION_FEE_MINOR   amount in the currency's smallest unit (kobo for NGN)
//   VERIFICATION_CURRENCY    ISO code, e.g. NGN
//   VERIFICATION_PAYMENT_ENABLED=true   final switch to start charging
function getVerificationConfig(env = process.env) {
  const amountMinor = Number(env.VERIFICATION_FEE_MINOR);
  const currency = String(env.VERIFICATION_CURRENCY || '').trim().toUpperCase();
  const configured = Number.isInteger(amountMinor) && amountMinor > 0 && /^[A-Z]{3}$/.test(currency);
  return {
    amountMinor: configured ? amountMinor : null,
    currency: configured ? currency : null,
    configured,
    paymentEnabled: configured && String(env.VERIFICATION_PAYMENT_ENABLED).toLowerCase() === 'true',
  };
}

module.exports = { getVerificationConfig };
