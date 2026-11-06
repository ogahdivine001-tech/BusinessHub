const fs = require('fs');
const path = require('path');
const { buildFacts, resolveFacts } = require('./knowledgeFacts');

// The help knowledge base: markdown articles in server/knowledge, with fact
// placeholders filled in from the live configuration, split into searchable
// sections and ranked with BM25 (the standard keyword-relevance formula).
// It needs no external service, so search works even when no AI provider is
// configured.

const DEFAULT_DIR = path.join(__dirname, '..', 'knowledge');
const AUDIENCES = ['public', 'seller'];
// A visitor sees `public` only; a logged-in seller also sees `seller`.
const VISIBLE = { public: ['public'], seller: ['public', 'seller'] };

const STOPWORDS = new Set((
  'a an the and or but if of to in on at by for with from as is are was were be been being do does did can could ' +
  'should would will may might i me my we our you your it its this that these those there here what which who whom ' +
  'how when where why not no yes so than then too very just about into out up down over under again also any all ' +
  'some such only own same each both more most other get got have has had am please tell show want need ' +
  'whats hows whos wheres thats theres im ive ill id dont doesnt didnt isnt arent wasnt wont'
).split(/\s+/));

// Very light stemming so "invoice"/"invoices", "create"/"created"/"creating" and
// "pay"/"paying" meet in the middle. It strips common endings, then a trailing
// "e", the same way for documents and questions, so both sides always agree.
function stem(w) {
  let x = w;
  if (x.length > 5 && x.endsWith('ies')) x = `${x.slice(0, -3)}y`;
  else if (x.length > 5 && x.endsWith('ing')) x = x.slice(0, -3);
  else if (x.length > 4 && x.endsWith('ed')) x = x.slice(0, -2);
  else if (x.length > 4 && /(ss|x|z|ch|sh|o)es$/.test(x)) x = x.slice(0, -2); // businesses, boxes, watches
  else if (x.length > 3 && x.endsWith('s') && !x.endsWith('ss')) x = x.slice(0, -1);
  if (x.length > 4 && x.endsWith('e')) x = x.slice(0, -1);
  return x;
}
const SYNONYMS = { paid: 'pay', payment: 'pay', cant: 'cannot', unable: 'cannot', cost: 'price', pricing: 'price', fee: 'price', badge: 'verification', verified: 'verification', verify: 'verification', login: 'log', signin: 'log', signup: 'register', sign: 'register', subscription: 'plan', upgrade: 'plan', renew: 'plan', rating: 'review', ratings: 'review', stars: 'review', ai: 'ai', chatbot: 'ai', bot: 'ai' };

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9₦]+/)
    .filter((w) => w && w.length > 1 && !STOPWORDS.has(w))
    .map((w) => stem(SYNONYMS[w] || w))
    .map((w) => SYNONYMS[w] || w);
}

const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

function parseFrontMatter(raw, file) {
  const m = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing the --- header block`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const k of ['title', 'category', 'audience']) if (!meta[k]) throw new Error(`${file}: header is missing "${k}"`);
  if (!AUDIENCES.includes(meta.audience)) throw new Error(`${file}: audience must be one of ${AUDIENCES.join(', ')}`);
  meta.tags = meta.tags ? meta.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  return { meta, body: m[2].trim() };
}

// Splits an article into sections at "## " headings (long sections are split
// further so an excerpt stays short).
function sectionsOf(body, title) {
  const out = []; let heading = title; let buf = [];
  const flush = () => {
    const text = buf.join('\n').trim();
    if (!text) return;
    const paras = text.split(/\n{2,}/); let cur = '';
    for (const p of paras) {
      if (cur && (cur.length + p.length) > 900) { out.push({ heading, text: cur.trim() }); cur = ''; }
      cur += `${p}\n\n`;
    }
    if (cur.trim()) out.push({ heading, text: cur.trim() });
  };
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) { flush(); heading = h[1].trim(); buf = []; } else buf.push(line);
  }
  flush();
  return out;
}

class KnowledgeBase {
  constructor(articles, problems = []) {
    this.articles = articles;
    this.problems = problems; // anything wrong found while loading (reported, never thrown at runtime)
    this.chunks = [];
    for (const a of articles) {
      for (const s of sectionsOf(a.body, a.title)) {
        const weights = new Map();
        const add = (text, w) => tokenize(text).forEach((t) => weights.set(t, (weights.get(t) || 0) + w));
        add(s.heading, 3); add(a.title, 2); add(a.tags.join(' '), 2); add(s.text, 1);
        const len = [...weights.values()].reduce((x, y) => x + y, 0);
        // The words that say what this section is ABOUT: its heading, its article's title and tags.
        const topic = new Set(tokenize(`${s.heading} ${a.title} ${a.tags.join(' ')}`));
        this.chunks.push({ articleId: a.id, title: a.title, category: a.category, audience: a.audience, heading: s.heading, anchor: slug(s.heading), text: s.text, weights, len, topic });
      }
    }
    this.avgLen = this.chunks.reduce((n, c) => n + c.len, 0) / (this.chunks.length || 1);
    this.df = new Map();
    for (const c of this.chunks) for (const t of c.weights.keys()) this.df.set(t, (this.df.get(t) || 0) + 1);
  }

  visible(level = 'public') {
    const ok = VISIBLE[level] || VISIBLE.public;
    return this.articles.filter((a) => ok.includes(a.audience));
  }

  getArticle(id, level = 'public') {
    return this.visible(level).find((a) => a.id === id) || null;
  }

  // Ranks sections with BM25. A section is only returned if BOTH hold:
  //  1. it is about something the question mentions: at least one question word
  //     appears in the section's heading, its article's title or its tags; and
  //  2. it covers a fair share of the question: the rarity-weighted share of the
  //     question's words found in the section reaches `minCoverage` (words that
  //     appear nowhere in the help count as not covered).
  // Together these mean a question that is really about something else ("who
  // won the football match") returns nothing instead of a forced match on one
  // shared word, while ordinary conversational wording still finds its answer.
  // Neither rule depends on how many articles there are.
  search(query, { level = 'public', limit = 4, minCoverage = 0.2 } = {}) {
    const ok = VISIBLE[level] || VISIBLE.public;
    const q = [...new Set(tokenize(query))];
    if (!q.length) return [];
    const N = Math.max(this.chunks.length, 1); const k1 = 1.2; const b = 0.75;
    const idfOf = (df) => Math.log(1 + (N - df + 0.5) / (df + 0.5));
    const total = q.reduce((n, t) => n + idfOf(this.df.get(t) || 0), 0); // unknown words carry the highest weight
    const scored = [];
    for (const c of this.chunks) {
      if (!ok.includes(c.audience)) continue;
      let score = 0; let matched = 0;
      for (const t of q) {
        const tf = c.weights.get(t); if (!tf) continue;
        const idf = idfOf(this.df.get(t) || 0);
        matched += idf;
        score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (c.len / this.avgLen))));
      }
      if (matched / total >= minCoverage && q.some((t) => c.topic.has(t))) scored.push({ score, chunk: c });
    }
    scored.sort((x, y) => y.score - x.score);
    return scored.slice(0, limit).map(({ score, chunk }) => ({
      score: Math.round(score * 100) / 100, articleId: chunk.articleId, title: chunk.title, category: chunk.category,
      heading: chunk.heading, anchor: chunk.anchor, text: chunk.text,
    }));
  }
}

// Reads every article, fills in facts, and reports (not hides) problems.
function loadKnowledge({ dir = DEFAULT_DIR, facts = buildFacts() } = {}) {
  const problems = []; const articles = [];
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_')).sort(); }
  catch (err) { problems.push(`Cannot read the knowledge folder: ${err.message}`); }
  for (const file of files) {
    try {
      const { meta, body } = parseFrontMatter(fs.readFileSync(path.join(dir, file), 'utf8'), file);
      const resolved = resolveFacts(body, facts);
      const title = resolveFacts(meta.title, facts);
      resolved.missing.concat(title.missing).forEach((k) => problems.push(`${file}: unknown fact {{${k}}}`));
      articles.push({ id: file.replace(/\.md$/, ''), title: title.text, category: meta.category, audience: meta.audience, tags: meta.tags, updated: meta.updated || null, body: resolved.text });
    } catch (err) { problems.push(err.message); }
  }
  const ids = new Set();
  for (const a of articles) { if (ids.has(a.id)) problems.push(`duplicate article id ${a.id}`); ids.add(a.id); }
  return new KnowledgeBase(articles, problems);
}

let singleton = null;
function getKnowledgeBase() {
  if (!singleton) {
    singleton = loadKnowledge();
    if (singleton.problems.length) console.error('[knowledge] problems found:\n  ' + singleton.problems.join('\n  '));
  }
  return singleton;
}
const resetKnowledgeBase = () => { singleton = null; };

module.exports = { loadKnowledge, getKnowledgeBase, resetKnowledgeBase, KnowledgeBase, tokenize, parseFrontMatter, sectionsOf, AUDIENCES };
