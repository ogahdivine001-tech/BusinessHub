import { Routes, Route } from 'react-router-dom';

import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';

import Landing from './pages/Landing';
import NotFound from './pages/NotFound';
import ServerError from './pages/ServerError';
import Onboarding from './pages/Onboarding';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

import Privacy from './pages/legal/Privacy';
import Terms from './pages/legal/Terms';
import About from './pages/legal/About';
import Contact from './pages/legal/Contact';

import Store from './pages/public/Store';

import DashboardHome from './pages/dashboard/DashboardHome';
import MyBusiness from './pages/dashboard/MyBusiness';
import Products from './pages/dashboard/Products';
import Orders from './pages/dashboard/Orders';
import Customers from './pages/dashboard/Customers';
import CustomerProfile from './pages/dashboard/CustomerProfile';
import Invoices from './pages/dashboard/Invoices';
import Receipts from './pages/dashboard/Receipts';
import Analytics from './pages/dashboard/Analytics';
import AIAssistant from './pages/dashboard/AIAssistant';
import Marketing from './pages/dashboard/Marketing';
import Settings from './pages/dashboard/Settings';
import SubscriptionCallback from './pages/dashboard/SubscriptionCallback';

import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBusinesses from './pages/admin/AdminBusinesses';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';

export default function App() {
  return (
    <Routes>
      {/* Public marketing site */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Onboarding (logged in, not yet onboarded) */}
      <Route element={<ProtectedRoute requireOnboarding={false} />}>
        <Route path="/onboarding" element={<Onboarding />} />
      </Route>

      {/* Public storefront */}
      <Route path="/store/:slug" element={<Store />} />

      {/* Dashboard (protected) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/dashboard/business" element={<MyBusiness />} />
          <Route path="/dashboard/products" element={<Products />} />
          <Route path="/dashboard/orders" element={<Orders />} />
          <Route path="/dashboard/customers" element={<Customers />} />
          <Route path="/dashboard/customers/:id" element={<CustomerProfile />} />
          <Route path="/dashboard/invoices" element={<Invoices />} />
          <Route path="/dashboard/receipts" element={<Receipts />} />
          <Route path="/dashboard/analytics" element={<Analytics />} />
          <Route path="/dashboard/ai-assistant" element={<AIAssistant />} />
          <Route path="/dashboard/marketing" element={<Marketing />} />
          <Route path="/dashboard/settings" element={<Settings />} />
          <Route path="/dashboard/settings/subscription/callback" element={<SubscriptionCallback />} />
        </Route>
      </Route>

      {/* Admin (protected, admin role only) */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/businesses" element={<AdminBusinesses />} />
          <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
        </Route>
      </Route>

      <Route path="/500" element={<ServerError />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
