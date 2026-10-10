import { useEffect, useState } from 'react';
import { Copy, Megaphone, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Select from '../../components/Select';
import UsageBar from '../../components/UsageBar';
import { aiService } from '../../services/aiService';

function ToolCard({ title, description, fields, type, buildParams, atLimit, onGenerated }) {
  const [values, setValues] = useState({});
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setValues((v) => ({ ...v, [key]: val }));

  const generate = async () => {
    if (atLimit) return;
    setLoading(true);
    try {
      const content = await aiService.generate(type, buildParams(values));
      setResult(content);
      onGenerated?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    toast.success('Copied to clipboard.');
  };

  return (
    <Card className="p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-ink-500 mt-1 mb-4">{description}</p>
      <div className="space-y-3 mb-4">
        {fields.map((f) =>
          f.type === 'select' ? (
            <Select key={f.key} label={f.label} value={values[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}>
              <option value="">Select {f.label.toLowerCase()}</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          ) : (
            <Input key={f.key} label={f.label} value={values[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
          )
        )}
      </div>
      <button onClick={generate} disabled={loading || atLimit} className="btn-primary w-full" title={atLimit ? 'Monthly AI limit reached for your plan' : undefined}>
        <Sparkles size={16} /> {atLimit ? 'Limit reached' : loading ? 'Generating…' : 'Generate'}
      </button>
      {result && (
        <div className="mt-4 relative">
          <div className="bg-ink-50 dark:bg-ink-800 rounded-xl p-4 text-sm whitespace-pre-wrap">{result}</div>
          <button onClick={copy} className="absolute top-2 right-2 p-1.5 rounded-lg bg-white dark:bg-ink-900 shadow-sm hover:bg-ink-100 dark:hover:bg-ink-700">
            <Copy size={14} />
          </button>
        </div>
      )}
    </Card>
  );
}

export default function Marketing() {
  const [usage, setUsage] = useState(null); // { used, limit, configured }

  const loadUsage = () => aiService.usage().then(setUsage).catch(() => {});
  useEffect(() => { loadUsage(); }, []);

  const atLimit = usage && Number.isFinite(usage.limit) && usage.used >= usage.limit;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="text-brand-600" size={24} /> Marketing Tools</h1>
        <p className="text-ink-500 text-sm mt-1">AI-powered content to help you promote your business.</p>
        {usage && (
          <div className="max-w-xs mt-3">
            <UsageBar label="AI requests this month" used={usage.used} limit={usage.limit} />
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <ToolCard
          title="Social Caption Generator"
          description="Generate captions for your posts."
          type="socialCaption"
          atLimit={atLimit}
          onGenerated={loadUsage}
          fields={[
            { key: 'product', label: 'Product / service', placeholder: 'e.g. Classic White Sneakers' },
            { key: 'platform', label: 'Platform', type: 'select', options: ['Instagram', 'Facebook', 'TikTok', 'Twitter/X'] },
            { key: 'tone', label: 'Tone', type: 'select', options: ['Friendly', 'Bold', 'Luxury', 'Playful', 'Professional'] },
          ]}
          buildParams={(v) => v}
        />
        <ToolCard
          title="Advertisement Generator"
          description="Generate high-converting ad copy."
          type="advertisement"
          atLimit={atLimit}
          onGenerated={loadUsage}
          fields={[
            { key: 'product', label: 'Product / service', placeholder: 'What are you advertising?' },
            { key: 'platform', label: 'Platform', type: 'select', options: ['Facebook Ads', 'Instagram Ads', 'WhatsApp Broadcast', 'Google Ads'] },
          ]}
          buildParams={(v) => v}
        />
        <ToolCard
          title="Product Description Generator"
          description="SEO-friendly descriptions for your products."
          type="productDescription"
          atLimit={atLimit}
          onGenerated={loadUsage}
          fields={[
            { key: 'name', label: 'Product name', placeholder: 'e.g. Retro Runner Sneakers' },
            { key: 'details', label: 'Key details', placeholder: 'Materials, features, benefits...' },
          ]}
          buildParams={(v) => v}
        />
        <ToolCard
          title="Business Bio Generator"
          description="A polished description of your business."
          type="businessDescription"
          atLimit={atLimit}
          onGenerated={loadUsage}
          fields={[
            { key: 'name', label: 'Business name', placeholder: 'Your business name' },
            { key: 'category', label: 'Category', placeholder: 'e.g. Fashion' },
            { key: 'details', label: 'What makes you unique?', placeholder: 'Optional details' },
          ]}
          buildParams={(v) => v}
        />
        <ToolCard
          title="Marketing Ideas"
          description="Personalized ideas to grow your reach."
          type="marketingIdeas"
          atLimit={atLimit}
          onGenerated={loadUsage}
          fields={[
            { key: 'business', label: 'Business name', placeholder: 'Your business name' },
            { key: 'category', label: 'Category', placeholder: 'e.g. Food, Fashion, Services' },
          ]}
          buildParams={(v) => v}
        />
      </div>
    </div>
  );
}
