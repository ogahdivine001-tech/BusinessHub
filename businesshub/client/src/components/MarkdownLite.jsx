import { Link } from 'react-router-dom';

// A small, safe renderer for the help articles: headings, paragraphs, lists,
// **bold** and links. It builds React elements only (never raw HTML), and only
// links to BusinessHub pages ("/...") or http(s) addresses.
export const slugify = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

function inline(text, keyBase) {
  const out = []; const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g; let last = 0; let m; let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0]; const key = `${keyBase}-${i++}`;
    if (tok.startsWith('**')) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else {
      const [, label, url] = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (url.startsWith('/') && !url.startsWith('//')) out.push(<Link key={key} to={url} className="text-brand-600 dark:text-brand-400 underline">{label}</Link>);
      else if (/^https?:\/\//i.test(url)) out.push(<a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 underline">{label}</a>);
      else out.push(label);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function MarkdownLite({ text }) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^(#{2,3})\s+(.+)$/);
    if (h) { blocks.push({ type: h[1].length === 2 ? 'h2' : 'h3', text: h[2] }); i++; continue; }
    if (/^-\s+/.test(line)) { const items = []; while (i < lines.length && /^-\s+/.test(lines[i])) items.push(lines[i++].replace(/^-\s+/, '')); blocks.push({ type: 'ul', items }); continue; }
    if (/^\d+\.\s+/.test(line)) { const items = []; while (i < lines.length && /^\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\d+\.\s+/, '')); blocks.push({ type: 'ol', items }); continue; }
    const para = []; while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|-\s|\d+\.\s)/.test(lines[i])) para.push(lines[i++]);
    blocks.push({ type: 'p', text: para.join(' ') });
  }
  return (
    <div className="space-y-3 text-ink-700 dark:text-ink-300 leading-relaxed">
      {blocks.map((b, n) => {
        if (b.type === 'h2') return <h2 key={n} id={slugify(b.text)} className="text-lg font-semibold text-ink-900 dark:text-ink-50 pt-4 scroll-mt-24">{inline(b.text, n)}</h2>;
        if (b.type === 'h3') return <h3 key={n} className="font-semibold text-ink-900 dark:text-ink-50 pt-2">{inline(b.text, n)}</h3>;
        if (b.type === 'ul') return <ul key={n} className="list-disc ml-5 space-y-1">{b.items.map((t, k) => <li key={k}>{inline(t, `${n}-${k}`)}</li>)}</ul>;
        if (b.type === 'ol') return <ol key={n} className="list-decimal ml-5 space-y-1">{b.items.map((t, k) => <li key={k}>{inline(t, `${n}-${k}`)}</li>)}</ol>;
        return <p key={n}>{inline(b.text, n)}</p>;
      })}
    </div>
  );
}
