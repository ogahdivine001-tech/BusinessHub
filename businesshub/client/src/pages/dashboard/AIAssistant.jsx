import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Send, Bot, User, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import UsageBar from '../../components/UsageBar';
import { aiService } from '../../services/aiService';
import LockedFeature from '../../components/LockedFeature';

// Questions about BusinessHub itself. They are sent as they are and answered from the Help Center.
const HELP_QUESTIONS = [
  'How do I renew or upgrade my plan?',
  'Why can\'t I create an invoice?',
  'How do I get my business verified?',
  'How do customers place orders?',
];

// Starters for general business writing. They only pre-fill the box; you finish the sentence.
const QUICK_ACTIONS = [
  { label: 'Write Product Description', type: 'productDescription', prompt: 'Write a product description for: ' },
  { label: 'Create Instagram Caption', type: 'socialCaption', prompt: 'Write an Instagram caption for: ' },
  { label: 'Create Facebook Ad', type: 'advertisement', prompt: 'Write a Facebook ad for: ' },
  { label: 'Create WhatsApp Advertisement', type: 'advertisement', prompt: 'Write a WhatsApp broadcast ad for: ' },
  { label: 'Generate Business Description', type: 'businessDescription', prompt: 'Write a business description for: ' },
  { label: 'Give Me Marketing Ideas', type: 'marketingIdeas', prompt: 'Give me marketing ideas for: ' },
  { label: 'Create Product Name', type: 'productName', prompt: 'Suggest product names for: ' },
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'ai', content: "Hi! I'm the BusinessHub Assistant. I can answer questions about using BusinessHub, and give general ideas for promoting your business. I'm an AI and can make mistakes, so please double-check important details." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState(null); // { used, limit, configured }
  const endRef = useRef(null);

  const loadUsage = () => aiService.usage().then(setUsage).catch(() => {});

  useEffect(() => { loadUsage(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const atLimit = usage && usage.scope === 'shared' && Number.isFinite(usage.limit) && usage.used >= usage.limit;

  const send = async (text) => {
    if (!text.trim() || atLimit || loading) return;
    // The last few turns go with the question so follow-ups make sense (the server re-checks and trims them).
    const history = messages.slice(1).map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })).slice(-6);
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const { reply, sources, mode } = await aiService.chat(text, history);
      setMessages((m) => [...m, { role: 'ai', content: reply, sources, mode }]);
      loadUsage();
    } catch (err) {
      toast.error(err.message);
      setMessages((m) => [...m, { role: 'ai', content: `Sorry, I couldn't process that: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (usage?.features && !usage.features.aiChat) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <LockedFeature title="AI business chat is not part of your plan" description="Ask the assistant for help with captions, product descriptions and business ideas." />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto flex flex-col h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="text-brand-600" size={24} /> AI Business Assistant</h1>
        <p className="text-ink-500 text-sm mt-1">Get instant help with marketing, copy, and business ideas.</p>
        {usage && (
          <div className="max-w-xs mt-3 space-y-1.5">
            {usage.scope === 'shared' && <UsageBar label="AI requests this month" used={usage.used} limit={usage.limit} />}
            {!usage.configured && (
              <p className="text-xs text-amber-600">The AI service isn't switched on yet. You will see matching Help Center articles instead.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-2" aria-label="Questions about BusinessHub">
        {HELP_QUESTIONS.map((q) => (
          <button key={q} onClick={() => send(q)} disabled={loading || atLimit}
            className="text-xs px-3 py-1.5 rounded-full border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 disabled:opacity-50 transition-colors">
            {q}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4" aria-label="Writing starters">
        {QUICK_ACTIONS.map((qa) => (
          <button key={qa.label} onClick={() => setInput(qa.prompt)}
            className="text-xs px-3 py-1.5 rounded-full border border-ink-200 dark:border-ink-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:border-brand-300 transition-colors">
            {qa.label}
          </button>
        ))}
      </div>

      <Card className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-brand-600' : 'bg-ink-100 dark:bg-ink-800'}`}>
                {m.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-brand-600" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-800 dark:text-ink-100'
              }`}>
                {m.content}
                {m.role === 'ai' && m.mode === 'help-only' && <p className="text-xs text-ink-500 mt-2">This answer comes straight from the Help Center, not from the AI.</p>}
                {m.role === 'ai' && m.sources?.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-ink-200 dark:border-ink-700 text-xs">
                    <p className="flex items-center gap-1 text-ink-500 mb-1"><BookOpen size={12} /> Related help</p>
                    <ul className="space-y-0.5">{m.sources.map((src) => <li key={src.id}><Link to={`/help/${src.id}#${src.anchor}`} className="text-brand-600 dark:text-brand-400 underline">{src.title}</Link></li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center"><Bot size={14} className="text-brand-600" /></div>
              <div className="bg-ink-100 dark:bg-ink-800 rounded-2xl px-4 py-2.5 text-sm text-ink-400">Thinking…</div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-ink-100 dark:border-ink-800 p-3 flex gap-2">
          <input
            className="input flex-1"
            maxLength={1000}
            placeholder={atLimit ? 'Monthly AI limit reached — upgrade your plan to continue' : 'Ask about BusinessHub or your business…'}
            value={input}
            disabled={atLimit}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" disabled={loading || atLimit} className="btn-primary px-4"><Send size={16} /></button>
        </form>
      </Card>
    </div>
  );
}
