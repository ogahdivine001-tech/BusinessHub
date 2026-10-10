import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Bot, User } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import UsageBar from '../../components/UsageBar';
import { aiService } from '../../services/aiService';

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
    { role: 'ai', content: "Hi! I'm your BusinessHub AI assistant. Ask me to help promote your business, write captions, generate ad copy, and more." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState(null); // { used, limit, configured }
  const endRef = useRef(null);

  const loadUsage = () => aiService.usage().then(setUsage).catch(() => {});

  useEffect(() => { loadUsage(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const atLimit = usage && Number.isFinite(usage.limit) && usage.used >= usage.limit;

  const send = async (text, type = 'chat') => {
    if (!text.trim() || atLimit) return;
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const content = await aiService.generate(type, type === 'chat' ? { message: text } : { details: text, product: text, business: text, category: text });
      setMessages((m) => [...m, { role: 'ai', content }]);
      loadUsage();
    } catch (err) {
      toast.error(err.message);
      setMessages((m) => [...m, { role: 'ai', content: `Sorry, I couldn't process that: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto flex flex-col h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="text-brand-600" size={24} /> AI Business Assistant</h1>
        <p className="text-ink-500 text-sm mt-1">Get instant help with marketing, copy, and business ideas.</p>
        {usage && (
          <div className="max-w-xs mt-3 space-y-1.5">
            <UsageBar label="AI requests this month" used={usage.used} limit={usage.limit} />
            {usage.configured ? (
              <p className="text-xs text-ink-400">Powered by {usage.provider}</p>
            ) : (
              <p className="text-xs text-amber-600">AI isn't configured on the server yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
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
            placeholder={atLimit ? 'Monthly AI limit reached — upgrade your plan to continue' : 'Ask me anything about your business...'}
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
