import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Mail, MessageCircle, Search, Sparkles } from 'lucide-react';
import Modal from './Modal';
import Input from './Input';
import { helpService } from '../services/helpService';

// A few starting points. Only the article ids are listed here; titles and
// content always come from the Help Center, so nothing here can go out of date.
const START_HERE = ['getting-started', 'plans-billing', 'invoices-receipts', 'verification', 'orders-customers', 'troubleshooting'];

export default function HelpModal({ open, onClose }) {
  const [q, setQ] = useState('');
  const [articles, setArticles] = useState([]);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (open && articles.length === 0) helpService.articles().then(setArticles).catch(() => {});
  }, [open, articles.length]);

  useEffect(() => {
    const text = q.trim();
    if (!text) { setResults(null); return undefined; }
    let cancelled = false;
    const t = setTimeout(() => helpService.search(text).then((r) => { if (!cancelled) setResults(r); }).catch(() => { if (!cancelled) setResults([]); }), 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const starters = START_HERE.map((id) => articles.find((a) => a.id === id)).filter(Boolean);

  return (
    <Modal open={open} onClose={onClose} title="Help & Support" size="lg">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
        <Input aria-label="Search help" className="pl-9" placeholder="Search help, e.g. “renew my plan”" value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="mt-4 max-h-64 overflow-y-auto" aria-live="polite">
        {results ? (
          results.length === 0 ? <p className="text-sm text-ink-500 py-3">No help articles match that. Try different words, or contact us below.</p> : (
            <ul className="space-y-2">{results.map((r) => (
              <li key={`${r.articleId}-${r.anchor}`}>
                <Link to={`/help/${r.articleId}#${r.anchor}`} onClick={onClose} className="block rounded-lg border border-ink-100 dark:border-ink-800 p-3 hover:bg-ink-50 dark:hover:bg-ink-800/50">
                  <p className="text-xs text-ink-400">{r.title}</p><p className="text-sm font-medium">{r.heading}</p>
                </Link>
              </li>))}</ul>
          )
        ) : (
          <>
            <p className="text-xs uppercase tracking-wide text-ink-400 mb-2">Start here</p>
            <ul className="space-y-1.5">{starters.map((a) => <li key={a.id}><Link to={`/help/${a.id}`} onClick={onClose} className="text-sm text-brand-600 dark:text-brand-400 hover:underline">{a.title}</Link></li>)}</ul>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/help" onClick={onClose} className="btn-secondary text-sm"><BookOpen size={14} /> Open Help Center</Link>
        <Link to="/dashboard/ai-assistant" onClick={onClose} className="btn-secondary text-sm"><Sparkles size={14} /> Ask the Assistant</Link>
      </div>

      <div className="mt-6 pt-4 border-t border-ink-100 dark:border-ink-800">
        <p className="text-sm font-medium mb-2">Still stuck? Talk to us</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/contact" onClick={onClose} className="btn-primary text-sm"><Mail size={14} /> Contact us</Link>
          <Link to="/contact" onClick={onClose} className="btn-secondary text-sm"><MessageCircle size={14} /> WhatsApp and Instagram</Link>
        </div>
      </div>
    </Modal>
  );
}
