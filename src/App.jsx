import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import PackOpening from '@/pages/PackOpening';
import Binder from '@/pages/Binder';
import SearchPage from '@/pages/Search';
import Wishlist from '@/pages/Wishlist';
import Marketplace from '@/pages/Marketplace';
import Orders from '@/pages/Orders';
import SetList from '@/pages/SetList';
import Alerts from '@/pages/Alerts';
import Scan from '@/pages/Scan';
import News from '@/pages/News';
import PublicBinder from '@/pages/PublicBinder';
import { CartProvider } from '@/lib/cart';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const { pathname } = useLocation();
  if (pathname.startsWith('/u/')) {
    return (
      <Routes>
        <Route path="/u/:userId" element={<PublicBinder />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    );
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/packs" element={<PackOpening />} />
        <Route path="/binder" element={<Binder />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/setlist" element={<SetList />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/news" element={<News />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <CartProvider>
            <AuthenticatedApp />
          </CartProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App