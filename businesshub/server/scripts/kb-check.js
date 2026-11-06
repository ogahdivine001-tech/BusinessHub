// Checks the help articles: valid headers, every {{fact}} exists, no duplicates.
//   npm run kb:check
const { loadKnowledge } = require('../services/knowledgeBase');
const kb = loadKnowledge();
console.log(`${kb.articles.length} articles, ${kb.chunks.length} searchable sections.`);
if (kb.problems.length) { console.error('\nProblems:\n  ' + kb.problems.join('\n  ')); process.exit(1); }
console.log('All good.');
