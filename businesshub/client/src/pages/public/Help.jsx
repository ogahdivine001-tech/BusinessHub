import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Search } from 'lucide-react';
import Input from '../../components/Input';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import MarkdownLite from '../../components/MarkdownLite';
import { helpService } from '../../services/helpService';

// Public Help Center. It works without logging in and without any AI, so help
// is always available.
function ArticleView({ id }) {
  const { hash } = useLocation();
  const [article, setArticle] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false; setArticle(null); setFailed(false);
    helpService.article(id).then((a) => { if (!cancelled) setArticle(a); }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [id]);
  useEffect(() => { // jump to the section a search result pointed at
    if (article && hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [article, hash]);

  if (failed) return <EmptyState icon={BookOpen} title="We couldn't find that article" description="It may have moved. Try searching the Help Center."
    action={<Link to="/help" className="btn-primary">Back to Help Center</Link>} />;
  if (!article) return <div className="py-16 flex justify-center"><LoadingSpinner size={28} /></div>;
  return (
    <article>
      <Link to="/help" className="text-sm text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 hover:underline"><ArrowLeft size={14} /> Help Center</Link>
      <p className="text-xs uppercase tracking-wide text-ink-400 mt-4">{article.category}</p>
      <h1 className="text-2xl sm:text-3xl font-bold mt-1 mb-4">{article.title}</h1>
      <MarkdownLite text={article.body} />
      {article.updated && <p className="text-xs text-ink-400 mt-8">Last reviewed {article.updated}</p>}
    </article>
  );
}

function HelpHome() {
  const [q, setQ] = useState('');
  const [articles, setArticles] = useState(null);
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => { helpService.articles().then(setArticles).catch(() => setArticles([])); }, []);
  useEffect(() => { // search as the person types, after a short pause
    const text = q.trim();
    if (!text) { setResults(null); return undefined; }
    setSearching(true);
    let cancelled = false;
    const t = setTimeout(() => {
      helpService.search(text).then((r) => { if (!cancelled) setResults(r); }).catch(() => { if (!cancelled) setResults([]); }).finally(() => { if (!cancelled) setSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const groups = (articles || []).reduce((g, a) => ({ ...g, [a.category]: [...(g[a.category] || []), a] }), {});
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold">Help Center</h1>
      <p className="text-ink-500 mt-1">Answers about using BusinessHub: plans, invoices, verification, reviews and more.</p>
      <div className="mt-5 relative" role="search">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
        <Input aria-label="Search the Help Center" className="pl-9" placeholder="Search, e.g. “how do I renew my plan”" value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} />
      </div>

      {q.trim() ? (
        <div className="mt-6" aria-live="polite">
          {searching && !results ? <div className="py-8 flex justify-center"><LoadingSpinner size={22} /></div>
            : results && results.length === 0 ? (
              <EmptyState icon={Search} title="No help articles match that" description="Try different words, browse the topics below, or contact us."
                action={<Link to="/contact" className="btn-secondary">Contact us</Link>} />
            ) : (
              <ul className="space-y-3">
                {(results || []).map((r) => (
                  <li key={`${r.articleId}-${r.anchor}`}>
                    <Link to={`/help/${r.articleId}#${r.anchor}`} className="card p-4 block hover:shadow-md transition-shadow">
                      <p className="text-xs text-ink-400">{r.category} · {r.title}</p>
                      <p className="font-medium mt-0.5">{r.heading}</p>
                      <p className="text-sm text-ink-500 mt-1 line-clamp-2">{r.excerpt}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
        </div>
      ) : (
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          {articles === null ? <div className="md:col-span-2 py-8 flex justify-center"><LoadingSpinner size={24} /></div> : Object.entries(groups).map(([cat, list]) => (
            <Card key={cat} className="p-5">
              <h2 className="font-semibold mb-2">{cat}</h2>
              <ul className="space-y-1.5">{list.map((a) => <li key={a.id}><Link to={`/help/${a.id}`} className="text-sm text-brand-600 dark:text-brand-400 hover:underline">{a.title}</Link></li>)}</ul>
            </Card>
          ))}
        </div>
      )}
      <p className="text-sm text-ink-500 mt-10">Can't find what you need? <Link to="/contact" className="text-brand-600 dark:text-brand-400 underline">Contact us</Link>.</p>
    </>
  );
}

export default function Help() {
  const { id } = useParams();
  return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">{id ? <ArticleView id={id} /> : <HelpHome />}</div>;
}
