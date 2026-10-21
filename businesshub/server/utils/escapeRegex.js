// Turns whatever a person typed into a search box into a SAFE literal pattern.
// Without this, typing "(" crashes the request, and a crafted pattern can
// freeze the server (regular-expression denial of service).
module.exports = function escapeRegex(input, maxLength = 100) {
  return String(input ?? '')
    .slice(0, maxLength)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
