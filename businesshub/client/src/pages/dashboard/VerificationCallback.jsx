import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';
import { verificationService } from '../../services/verificationService';

// Paystack sends the customer back here after the fee payment page. The
// redirect proves nothing by itself: we ask the server to confirm the payment
// with Paystack. Note that a confirmed fee only tells the reviewer the fee was
// received; it never verifies the business.
export default function VerificationCallback() {
  const [params] = useSearchParams();
  const [state, setState] = useState('verifying');
  const [error, setError] = useState('');
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) { setState('error'); setError('No payment reference was found in the URL.'); return; }
    verificationService.verifyPayment(reference).then(() => setState('done')).catch((e) => { setState('error'); setError(e.message); });
  }, [params]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card className="p-8 max-w-sm w-full text-center">
        {state === 'verifying' && (<><LoadingSpinner size={32} className="mx-auto" /><h1 className="text-lg font-semibold mt-4">Confirming your payment…</h1></>)}
        {state === 'done' && (<><CheckCircle2 size={36} className="text-green-600 mx-auto" /><h1 className="text-lg font-semibold mt-3">Payment received</h1>
          <p className="text-sm text-ink-500 mt-1">Your verification request is now with our team for review.</p>
          <Link to="/dashboard/verification" className="btn-primary w-full mt-6 inline-block">Back to verification</Link></>)}
        {state === 'error' && (<><XCircle size={36} className="text-red-600 mx-auto" /><h1 className="text-lg font-semibold mt-3">We couldn't confirm this payment</h1>
          <p className="text-sm text-ink-500 mt-1">{error || 'Please try again, or contact support if you were charged.'}</p>
          <Link to="/dashboard/verification" className="btn-secondary w-full mt-6 inline-block">Back to verification</Link></>)}
      </Card>
    </div>
  );
}
