import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../common/NotificationBell';
import { BrandLoader } from '../common/Loader';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Truck,
  RotateCcw,
  DollarSign,
  Users,
  Image,
  Sliders,
  Sparkles,
  TrendingUp,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Bell,
  ArrowUpRight,
  Ticket,
  BellRing,
} from 'lucide-react';

const AdminLayout = ({ children, title = 'Atelier Console', subtitle = '' }) => {
  const { user, loading: authLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Wait for the session check so staff never see a flash of "Restricted Access"
  if (authLoading) {
    return <BrandLoader fullScreen label="Verifying access" />;
  }

  // Riders have their own dashboard
  if (user && user.role === 'rider') {
    return <Navigate to="/rider" replace />;
  }

  // If user is not logged in or is a regular customer, render access restriction
  if (!user || user.role === 'customer') {
    return (
      <div className="min-h-screen bg-charcoal text-snow flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#1F2226] border border-white/10 p-8 rounded-sm shadow-2xl text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-burgundy/20 border border-burgundy/40 flex items-center justify-center text-burgundy">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-serif tracking-wider mb-2">Restricted Access</h2>
          <p className="text-silver/80 text-sm mb-6">
            The WinterWear Operations Console requires verified staff credentials. Your current role (
            <span className="text-cream font-medium">{user?.role || 'Guest'}</span>) is unauthorized.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/login?redirect=/admin')}
              className="px-6 py-2.5 bg-burgundy hover:bg-burgundy/90 text-snow text-xs uppercase tracking-widest transition"
            >
              Staff Sign In
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 border border-white/20 hover:border-white text-snow text-xs uppercase tracking-widest transition"
            >
              Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  const role = user.role;

  // Role based navigation access
  const allNavItems = [
    {
      name: 'Dashboard',
      path: '/admin',
      icon: LayoutDashboard,
      roles: ['super_admin', 'admin', 'finance_staff', 'finance', 'marketing_manager'],
    },
    {
      name: 'Inventory Dashboard',
      path: '/admin/inventory-dashboard',
      icon: Boxes,
      roles: ['super_admin', 'admin', 'inventory_manager', 'warehouse_staff'],
    },
    {
      name: 'Products & Catalog',
      path: '/admin/products',
      icon: Package,
      roles: ['super_admin', 'admin', 'inventory_manager'],
    },
    {
      name: 'Inventory & Warehouses',
      path: '/admin/inventory',
      icon: Boxes,
      roles: ['super_admin', 'admin', 'inventory_manager', 'warehouse_staff'],
    },
    {
      name: 'Orders & Fulfillment',
      path: '/admin/orders',
      icon: ShoppingCart,
      roles: ['super_admin', 'admin', 'fulfillment_staff', 'fulfillment', 'customer_support', 'inventory_manager'],
    },
    {
      name: 'Rider Portal',
      path: '/admin/rider',
      icon: Truck,
      roles: ['super_admin', 'admin', 'rider'],
    },
    {
      name: 'Returns & CS',
      path: '/admin/returns',
      icon: RotateCcw,
      roles: ['super_admin', 'admin', 'customer_support'],
    },
    {
      name: 'Finance & COD',
      path: '/admin/finance',
      icon: DollarSign,
      roles: ['super_admin', 'admin', 'finance_staff', 'finance'],
    },
    {
      name: 'Staff & Audit Logs',
      path: '/admin/staff',
      icon: Users,
      roles: ['super_admin', 'admin'],
    },
    {
      name: 'Media Library',
      path: '/admin/media',
      icon: Image,
      roles: ['super_admin', 'admin', 'marketing_manager'],
    },
    {
      name: 'Banners',
      path: '/admin/banners',
      icon: Sliders,
      roles: ['super_admin', 'admin', 'marketing_manager'],
    },
    {
      name: 'Campaigns',
      path: '/admin/campaigns',
      icon: Sparkles,
      roles: ['super_admin', 'admin', 'marketing_manager'],
    },
    {
      name: 'Coupons',
      path: '/admin/coupons',
      icon: Ticket,
      roles: ['super_admin', 'admin', 'marketing_manager'],
    },
    {
      name: 'Notifications',
      path: '/admin/notifications',
      icon: BellRing,
      roles: ['super_admin', 'admin', 'marketing_manager'],
    },
    {
      name: 'Analytics & BI',
      path: '/admin/analytics',
      icon: TrendingUp,
      roles: ['super_admin', 'admin', 'finance_staff', 'finance', 'inventory_manager', 'marketing_manager'],
    },
  ];

  const allowedNav = allNavItems.filter((item) =>
    role === 'super_admin' ? true : item.roles.includes(role)
  );

  const formatRole = (r) => {
    if (!r) return 'Staff';
    return r
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#111315] text-snow flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#17191C] border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-burgundy/20 border border-burgundy flex items-center justify-center font-serif text-snow font-bold text-lg">
              W
            </div>
            <div>
              <span className="font-serif tracking-widest text-sm text-snow font-semibold block leading-none">
                WINTERWEAR
              </span>
              <span className="text-[10px] tracking-wider text-ice uppercase block mt-1">
                Ops Atelier
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-silver hover:text-snow lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info Capsule */}
        <div className="p-4 mx-3 my-3 bg-[#1F2226] border border-white/5 rounded">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-ice/10 border border-ice/30 flex items-center justify-center text-ice font-serif text-sm">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-snow truncate">{user.name || 'Staff User'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] text-cream/80 uppercase tracking-wider truncate">
                  {formatRole(user.role)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav data-lenis-prevent className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 space-y-1 py-2">
          {allowedNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-xs rounded transition-all group ${
                  isActive
                    ? 'bg-burgundy text-snow font-medium shadow-sm'
                    : 'text-silver/90 hover:text-snow hover:bg-white/5'
                }`}
              >
                <Icon
                  size={16}
                  className={`transition ${isActive ? 'text-snow' : 'text-ice/70 group-hover:text-snow'}`}
                />
                <span className="tracking-wide flex-1">{item.name}</span>
                {isActive && <ChevronRight size={14} className="opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 text-xs text-silver hover:text-snow hover:bg-white/5 rounded transition"
          >
            <span className="flex items-center gap-2">
              <ArrowUpRight size={14} /> View Storefront
            </span>
          </Link>
          <Link
            to="/profile"
            className="flex items-center justify-between px-3 py-2 text-xs text-silver hover:text-snow hover:bg-white/5 rounded transition"
          >
            <span className="flex items-center gap-2">
              <Users size={14} /> My Profile
            </span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition"
          >
            <LogOut size={14} /> Log Out Console
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Bar */}
        <header className="h-16 bg-[#17191C]/90 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-silver hover:text-snow lg:hidden"
            >
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-base lg:text-lg font-serif text-snow tracking-wide">{title}</h1>
              {subtitle && <p className="text-xs text-silver/80 hidden sm:block">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[11px] text-ice tracking-wider hidden sm:inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live Sync Active
            </span>
            <div className="text-right hidden md:block">
              <div className="text-xs text-snow font-medium">{user.email}</div>
              <div className="text-[10px] text-cream/70 uppercase tracking-widest">
                {formatRole(user.role)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
