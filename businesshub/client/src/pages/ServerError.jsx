import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import Logo from '../components/Logo';

export default function ServerError() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <Logo size="lg" />
      <h1 className="text-6xl font-extrabold text-red-500 mt-8">500</h1>
      <p className="text-ink-500 mt-2">Something went wrong on our end. Please try again.</p>
      <Link to="/" className="btn-primary mt-6"><Home size={16} /> Back home</Link>
    </div>
  );
}
