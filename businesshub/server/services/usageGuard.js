const ApiError = require('../utils/apiError');

// Plan limits are enforced "create, then verify" instead of "count, then
// create". Counting first lets two simultaneous requests both see room for
// one more and both succeed. Here each request records its own item first,
// then re-counts; if the total is over the limit the request removes its own
// item and is refused. Under a tie both may be refused (the user can simply
// retry), but the limit can never be exceeded.
async function verifyWithinLimit({ count, limit, undo, message }) {
  if (!Number.isFinite(limit)) return; // unlimited plans skip the check
  const total = await count();
  if (total > limit) {
    try { await undo(); } catch (err) { console.error('[usage] could not roll back over-limit item:', err.message); }
    throw new ApiError(403, message);
  }
}

module.exports = { verifyWithinLimit };
