import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { NotificationProvider } from './context/NotificationContext';
import { useSmoothScroll } from './hooks/useSmoothScroll';

// Common Components
import AnnouncementBar from './components/common/AnnouncementBar';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import CartDrawer from './components/common/CartDrawer';
import { BrandLoader } from './components/common/Loader';

// Storefront Pages
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const Favorites = lazy(() => import('./pages/Favorites'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess/OrderSuccess'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const PaymentFailurePage = lazy(() => import('./pages/PaymentFailurePage'));
const PaymentCancelledPage = lazy(() => import('./pages/PaymentCancelledPage'));
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage'));
const OrderDetailsPage = lazy(() => import('./pages/OrderDetailsPage'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const SizeGuidePage = lazy(() => import('./pages/SizeGuidePage'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const PolicyPage = lazy(() => import('./pages/PolicyPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Phase 6 Admin & Staff Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory'));
const InventoryDashboard = lazy(() => import('./pages/admin/InventoryDashboard'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const RiderDashboard = lazy(() => import('./pages/rider/RiderDashboard'));
const AdminReturns = lazy(() => import('./pages/admin/AdminReturns'));
const AdminFinance = lazy(() => import('./pages/admin/AdminFinance'));
const AdminStaff = lazy(() => import('./pages/admin/AdminStaff'));
const AdminMediaLibrary = lazy(() => import('./pages/admin/AdminMediaLibrary'));
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'));
const AdminCampaigns = lazy(() => import('./pages/admin/AdminCampaigns'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));

// Phase 7 AI Concierge & Style Assistant
import WinterWearAIChat from './components/ai/WinterWearAIChat';
const StyleAssistantPage = lazy(() => import('./pages/StyleAssistantPage'));

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Initialize smooth scroll synchronized with GSAP ScrollTrigger on storefront
  useSmoothScroll();

  return (
    <div className="flex flex-col min-h-screen bg-charcoal text-snow selection:bg-burgundy selection:text-snow">
      {!isAdminRoute && <AnnouncementBar />}
      {!isAdminRoute && <Navbar />}

      <main className="flex-1">
        <Suspense
          fallback={
            <BrandLoader
              fullScreen={isAdminRoute}
              label={isAdminRoute ? 'Loading console' : 'Loading'}
            />
          }
        >
        <Routes>
          {/* Storefront Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/success" element={<PaymentSuccessPage />} />
          <Route path="/checkout/failure" element={<PaymentFailurePage />} />
          <Route path="/checkout/cancelled" element={<PaymentCancelledPage />} />
          <Route path="/order-success/:orderId" element={<OrderSuccess />} />
          <Route path="/my-orders" element={<MyOrdersPage />} />
          <Route path="/my-orders/:orderId" element={<OrderDetailsPage />} />
          <Route path="/order-tracking" element={<OrderTracking />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/size-guide" element={<SizeGuidePage />} />
          <Route path="/shipping-policy" element={<PolicyPage />} />
          <Route path="/returns-policy" element={<PolicyPage />} />
          <Route path="/privacy-policy" element={<PolicyPage />} />
          <Route path="/terms" element={<PolicyPage />} />
          <Route path="/style-assistant" element={<StyleAssistantPage />} />
          <Route path="/faq" element={<PolicyPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Phase 6 & 7 Operational & Admin Console Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/inventory" element={<AdminInventory />} />
          <Route path="/admin/inventory-dashboard" element={<InventoryDashboard />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/rider" element={<RiderDashboard />} />
          <Route path="/rider" element={<RiderDashboard />} />
          <Route path="/admin/returns" element={<AdminReturns />} />
          <Route path="/admin/finance" element={<AdminFinance />} />
          <Route path="/admin/staff" element={<AdminStaff />} />
          <Route path="/admin/media" element={<AdminMediaLibrary />} />
          <Route path="/admin/banners" element={<AdminBanners />} />
          <Route path="/admin/campaigns" element={<AdminCampaigns />} />
          <Route path="/admin/coupons" element={<AdminCoupons />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>

      {!isAdminRoute && <CartDrawer />}
      {!isAdminRoute && <WinterWearAIChat />}
      {!isAdminRoute && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
        <CartProvider>
          <WishlistProvider>
            <AppContent />
          </WishlistProvider>
        </CartProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
