import { Navigate, Outlet } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

// The customer area: any logged-in person (customers, and sellers who also
// follow and review other businesses). No business setup is required.
export default function AccountRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size={28} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
