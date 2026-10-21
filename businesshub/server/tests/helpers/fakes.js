// Small in-memory stand-ins so business rules can be tested without a database.
const path = require('path');
const Module = require('module');

function makeModel(seed = [], { unique = [] } = {}) {
  const rows = seed.map((r, i) => ({ _id: r._id || `seed${i + 1}`, ...r }));
  const matches = (row, q) =>
    Object.entries(q).every(([k, v]) => {
      const val = row[k];
      if (v === null) return val === null || val === undefined;
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        if ('$in' in v) return v.$in.map(String).includes(String(val));
        if ('$ne' in v) return String(val) !== String(v.$ne);
      }
      return String(val) === String(v);
    });
  const apply = (row, upd) => Object.assign(row, upd.$set || (Object.keys(upd).some((k) => k.startsWith('$')) ? {} : upd));
  return {
    rows,
    findOne: async (q) => { const r = rows.find((x) => matches(x, q)); return r ? { ...r } : null; },
    create: async (doc) => {
      for (const f of unique) {
        if (rows.some((r) => String(r[f]) === String(doc[f]))) { const e = new Error('E11000 duplicate key'); e.code = 11000; throw e; }
      }
      const row = { _id: `id${rows.length + 1}`, ...doc }; rows.push(row); return { ...row };
    },
    findOneAndUpdate: async (q, upd, opts = {}) => {
      let row = rows.find((x) => matches(x, q));
      if (!row && opts.upsert) { row = { _id: `id${rows.length + 1}`, ...q }; rows.push(row); }
      if (!row) return null;
      apply(row, upd); return { ...row };
    },
    updateOne: async (q, upd) => { const r = rows.find((x) => matches(x, q)); if (r) apply(r, upd); },
  };
}

// Replace a project module (e.g. 'models/Payment.js') before anything requires it.
function inject(rel, exports) {
  const file = path.resolve(__dirname, '..', '..', rel);
  const m = new Module(file); m.filename = file; m.exports = exports; m.loaded = true; require.cache[file] = m;
}

// Calls an Express handler the way Express would and reports what came back.
async function callHandler(fn, req = {}) {
  const out = {};
  const res = {
    status(c) { out.status = c; return res; },
    json(b) { out.body = b; return res; },
    sendStatus(c) { out.status = c; out.sent = true; return res; },
  };
  await fn({ headers: {}, body: {}, params: {}, query: {}, user: { _id: 'u1' }, ...req }, res, (e) => { out.error = e; });
  return out;
}

module.exports = { makeModel, inject, callHandler };
