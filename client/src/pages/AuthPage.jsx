
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spinner } from '../components/common/Loader';
import {
  User,
  Bike,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'rider' ? 'rider' : 'customer';

  const [role, setRole] = useState(initialRole);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('bike');
  const [city, setCity] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setNotice('');
    setLoading(true);

    try {
      const API_URL = (
        import.meta.env.VITE_API_BASE_URL || '/api/v1'
      ).replace(/\/+$/, '');

      const isRiderSignup = isRegister && role === 'rider';

      const endpoint = isRegister
        ? `${API_URL}/auth/${isRiderSignup ? 'register-rider' : 'register'}`
        : `${API_URL}/auth/login`;

      const payload = isRegister
        ? {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            ...(isRiderSignup && {
              phone: phone.trim(),
              vehicleType,
              city: city.trim() || undefined,
            }),
          }
        : {
            email: email.trim().toLowerCase(),
            password,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const validationMessage = result.errors
          ?.map((item) => item.message)
          .filter(Boolean)
          .join(', ');

        throw new Error(
          validationMessage ||
          result.message ||
          'Authentication failed.'
        );
      }

      const { user, accessToken } = result.data || {};

      if (!user || !accessToken) {
        throw new Error(
          'Invalid authentication response from server.'
        );
      }

      localStorage.setItem('ww_access_token', accessToken);
      localStorage.setItem('ww_user', JSON.stringify(user));

      setNotice(
        result.message || 'Authentication successful.'
      );

      const userRole = String(user.role || '').toLowerCase();

      const roleRoutes = {
        customer: '/',
        super_admin: '/admin',
        admin: '/admin',
        finance_staff: '/admin/finance',
        fulfillment_staff: '/admin/orders',
        customer_support: '/admin/returns',
        marketing_manager: '/admin/campaigns',
        inventory_manager: '/admin/inventory-dashboard',
        warehouse_staff: '/admin/inventory-dashboard',
        rider: '/rider',
      };

      // Honour ?redirect=/some/path (same-site paths only; customers never land on /admin)
      const redirect = searchParams.get('redirect');
      const safeRedirect =
        redirect && redirect.startsWith('/') && !redirect.startsWith('//')
          ? redirect
          : null;
      const allowedRedirect =
        safeRedirect &&
        !(userRole === 'customer' && safeRedirect.startsWith('/admin')) &&
        !(userRole === 'rider' && !safeRedirect.startsWith('/rider'))
          ? safeRedirect
          : null;

      window.location.assign(allowedRedirect || roleRoutes[userRole] || '/');
    } catch (error) {
      setNotice(
        error.message || 'Unable to connect to the server.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal text-snow py-16 flex items-center justify-center">
      <div className="max-w-md w-full mx-4 glass-panel p-8 rounded-lg border border-white/10 shadow-2xl space-y-6">

        {/* Role Selector */}
        <div>
          <span className="text-[10px] uppercase tracking-widest text-silver-dark font-bold block mb-2 text-center">
            I am signing in as
          </span>

          <div className="grid grid-cols-2 gap-1 p-1 bg-charcoal rounded border border-white/5 text-[11px]">
            {[
              { id: 'customer', label: 'Shopper', Icon: User },
              { id: 'rider', label: 'Rider', Icon: Bike },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setRole(id);
                  setNotice('');
                }}
                aria-pressed={role === id}
                className={`py-2 rounded font-medium flex flex-col items-center gap-1 transition-colors ${
                  role === id
                    ? 'bg-cream text-charcoal'
                    : 'text-silver hover:text-snow'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h2 className="font-editorial-serif text-3xl text-snow font-medium">
            {isRegister
              ? role === 'rider'
                ? 'Rider Registration'
                : 'Atelier Registration'
              : 'Sign In'}
          </h2>

          <p className="text-xs text-silver mt-1">
            {role === 'rider'
              ? isRegister
                ? 'Apply to deliver for WinterWear. An admin will confirm your account.'
                : 'Access your delivery rider workspace'
              : 'Shoppers and staff sign in here'}
          </p>
        </div>

        {/* Authentication Form */}
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-silver mb-1 font-semibold">
                Full Name
              </label>

              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Julian Vance"
                autoComplete="name"
                className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-cream"
              />
            </div>
          )}

          {isRegister && role === 'rider' && (
            <>
              <div>
                <label className="block text-xs uppercase tracking-wider text-silver mb-1 font-semibold">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0300 1234567"
                  autoComplete="tel"
                  className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-cream"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-silver mb-1 font-semibold">
                    Vehicle
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-cream"
                  >
                    <option value="bike">Motorbike</option>
                    <option value="bicycle">Bicycle</option>
                    <option value="car">Car</option>
                    <option value="van">Van</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-silver mb-1 font-semibold">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Lahore"
                    className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-cream"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs uppercase tracking-wider text-silver mb-1 font-semibold">
              Email Address
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@winterwear.fashion"
              autoComplete="email"
              className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-cream"
            />
          </div>

          {/* Password with Show/Hide */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-silver mb-1 font-semibold">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={isRegister ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete={
                  isRegister ? 'new-password' : 'current-password'
                }
                className="w-full bg-charcoal text-snow text-xs px-3.5 py-3 pr-10 rounded border border-white/10 focus:outline-none focus:border-cream"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                aria-label={
                  showPassword ? 'Hide password' : 'Show password'
                }
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-silver hover:text-cream transition-colors"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {isRegister && (
              <p className="text-[10px] text-silver mt-2">
                Password must contain at least 8 characters, one
                uppercase letter and one number.
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-burgundy hover:bg-burgundy-hover text-snow font-bold text-xs uppercase tracking-widest rounded transition-colors shadow-lg shadow-burgundy/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Spinner size={14} />
                Please Wait
              </span>
            ) : isRegister ? (
              role === 'rider' ? 'Submit Application' : 'Create Account'
            ) : (
              role === 'rider'
                ? 'Sign In As Rider'
                : 'Sign In'
            )}
          </button>
        </form>

        {isRegister && role === 'rider' && (
          <p className="flex items-start gap-2 text-[11px] text-silver leading-relaxed">
            <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-cream" />
            After you apply, your account stays in &ldquo;waiting for confirmation&rdquo; until an admin approves it.
          </p>
        )}

        {/* API Message */}
        {notice && (
          <div
            role="status"
            className="p-3 bg-cream/10 border border-cream/30 text-cream text-xs rounded text-center leading-relaxed"
          >
            {notice}
          </div>
        )}

        {/* Login/Register Toggle */}
        <div className="text-center pt-2 border-t border-white/5 text-xs text-silver">
          {isRegister ? (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setShowPassword(false);
                  setNotice('');
                }}
                className="text-cream underline font-semibold ml-1"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              New to WinterWear?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setShowPassword(false);
                  setNotice('');
                }}
                className="text-cream underline font-semibold ml-1"
              >
                {role === 'rider' ? 'Apply as a Rider' : 'Create an Atelier Account'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
