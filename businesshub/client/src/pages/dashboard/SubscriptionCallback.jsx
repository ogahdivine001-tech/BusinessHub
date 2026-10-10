import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';
import { subscriptionService } from '../../services/subscriptionService';

// Paystack redirects the customer back here (see callback_url set on checkout)
// after they complete or cancel payment on Paystack's hosted page. Paystack
// appends the transaction reference as a query param — we use it to verify
// the payment server-side and activate the plan, instead of trusting the
// redirect itself (a redirect alone proves nothing; the API call does).
export default function SubscriptionCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (!reference) {
      setStatus('error');
      setError('No payment reference was found in the URL.');
      return;
    }

    subscriptionService.verify(reference)
      .then(({ subscription }) => {
        setPlan(subscription.plan);
        setStatus('success');
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message);
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="p-8 max-w-sm w-full text-center">
        {status === 'verifying' && (
          <>
            <LoadingSpinner size={32} className="mx-auto" />
            <h1 className="text-lg font-semibold mt-4">Confirming your payment…</h1>
            <p className="text-sm text-ink-500 mt-1">This only takes a moment. Please don't close this page.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
            <h1 className="text-lg font-semibold">Payment successful</h1>
            <p className="text-sm text-ink-500 mt-1">
              Your business is now on the <span className="font-medium capitalize">{plan}</span> plan.
            </p>
            <Link to="/dashboard/settings" className="btn-primary w-full mt-6">Back to Settings</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <XCircle size={28} className="text-red-600" />
            </div>
            <h1 className="text-lg font-semibold">We couldn't confirm this payment</h1>
            <p className="text-sm text-ink-500 mt-1">{error || 'Please try again or contact support if you were charged.'}</p>
            <Link to="/dashboard/settings" className="btn-secondary w-full mt-6">Back to Settings</Link>
          </>
        )}
      </Card>
    </div>
  );
}
