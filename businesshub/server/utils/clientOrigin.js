// Where links in emails should point. Same policy as the password-reset link:
// NEVER taken from request headers on a deployed server (a forged Origin
// header could otherwise point a genuine BusinessHub email at another site).
// Only a direct local connection may use the request's own origin.
function getClientOrigin(req) {
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL.replace(/\/+$/, '');
  const addr = req && req.socket && req.socket.remoteAddress;
  const isLocal = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(addr);
  const origin = isLocal ? (req.headers && req.headers.origin) || 'http://localhost:5173' : 'https://businesshubng.vercel.app';
  return origin.replace(/\/+$/, '');
}

module.exports = { getClientOrigin };
