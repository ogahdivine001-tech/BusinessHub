import { Navigate, Outlet } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ requireOnboarding = true }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size={28} /></div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (requireOnboarding && !user.onboardingComplete) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}
