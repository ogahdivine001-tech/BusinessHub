import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import Logo from '../../components/Logo';
import LoadingSpinner from '../../components/LoadingSpinner';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../utils/homePath';

// Opened from the link in the verification email. The link works only once,
// so the request must be sent exactly once. React's StrictMode runs effects
// twice in development, which would turn a success into a "link used" error,
// hence the ref guard.
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const token = searchParams.get('token');
  const sent = useRef(false);
  const [state, setState] = useState(token ? 'verifying' : 'invalid');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    authService
      .verifyEmail(token)
      .then(() => {
        setState('done');
        refreshUser?.().catch(() => {}); // refresh the badge if they are logged in
      })
      .catch((err) => {
        setMessage(err.message || 'This link is invalid or has expired.');
        setState('invalid');
      });
  }, [token, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><Logo size="lg" /></div>
        <div className="card p-7 text-center">
          {state === 'verifying' && (
            <>
              <LoadingSpinner />
              <p className="mt-4 text-ink-600 dark:text-ink-400">Confirming your email…</p>
            </>
          )}
          {state === 'done' && (
            <>
              <CheckCircle2 className="mx-auto text-brand-600" size={40} />
              <h1 className="text-xl font-bold mt-3">Email confirmed</h1>
              <p className="text-ink-600 dark:text-ink-400 mt-2">Thanks! Your email address is now verified.</p>
              <Link to={user ? homeFor(user) : '/login'} className="btn-primary w-full mt-6 inline-block">Continue to BusinessHub</Link>
            </>
          )}
          {state === 'invalid' && (
            <>
              <XCircle className="mx-auto text-red-500" size={40} />
              <h1 className="text-xl font-bold mt-3">Link not valid</h1>
              <p className="text-ink-600 dark:text-ink-400 mt-2">
                {message || 'This link is invalid, has expired, or was already used.'}
              </p>
              <p className="text-sm text-ink-500 mt-3">
                Log in and choose <strong>Settings → Profile → Send verification email</strong> to get a new one.
              </p>
              <Link to="/login" className="btn-primary w-full mt-6 inline-block">Log in</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
