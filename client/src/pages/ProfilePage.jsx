import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Package,
  LogOut,
  Loader2,
  Eye,
  EyeOff,
  LayoutDashboard,
  Lock,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { BrandLoader } from '../components/common/Loader';
import CouponList from '../components/notifications/CouponList';

const formatRole = (role) =>
  (role || 'customer')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const errorMessage = (err, fallback) =>
  err.response?.data?.message || err.message || fallback;

const inputClass =
  'w-full bg-charcoal text-snow text-sm px-3.5 py-3 rounded border border-white/10 focus:outline-none focus:border-cream disabled:opacity-60 disabled:cursor-not-allowed';
const labelClass =
  'block text-xs uppercase tracking-wider text-silver mb-1 font-semibold';

const Banner = ({ type, children }) =>
  children ? (
    <div
      role="status"
      className={`p-3 rounded text-xs leading-relaxed border ${
        type === 'error'
          ? 'bg-red-500/10 border-red-500/30 text-red-300'
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
      }`}
    >
      {children}
    </div>
  ) : null;

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, loading, isAuthenticated, logout, updateUser } = useAuth();

  // Profile form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  const [loggingOut, setLoggingOut] = useState(false);

  // Guard: only signed-in users can see this page
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login?redirect=/profile', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  // Fill the form once the user is known
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  if (loading || !user) {
    return <BrandLoader label="Loading your profile" />;
  }

  const isStaff = user.role && user.role !== 'customer';
  const profileChanged =
    name.trim() !== (user.name || '') || phone.trim() !== (user.phone || '');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileSaving(true);
    try {
      const res = await authApi.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
      });
      const updated = res.data?.data?.user;
      if (updated) updateUser(updated);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: errorMessage(err, 'Could not update your profile.'),
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
      });
      const token = res.data?.data?.accessToken;
      if (token) localStorage.setItem('ww_access_token', token);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({
        type: 'success',
        text: res.data?.message || 'Password changed successfully.',
      });
    } catch (err) {
      setPasswordMsg({
        type: 'error',
        text: errorMessage(err, 'Could not change your password.'),
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="bg-charcoal text-snow py-12 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-8 border-b border-white/10">
          <div className="w-20 h-20 rounded-full bg-burgundy/20 border border-burgundy flex items-center justify-center font-serif text-3xl text-cream shrink-0">
            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-editorial-serif text-3xl sm:text-4xl text-snow font-medium truncate">
              {user.name || 'My Profile'}
            </h1>
            <p className="text-sm text-silver mt-1 truncate">{user.email}</p>
            <span className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[11px] uppercase tracking-widest text-ice">
              <ShieldCheck className="w-3.5 h-3.5" />
              {formatRole(user.role)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-burgundy hover:bg-burgundy-hover text-snow text-xs font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-60"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Personal information */}
            <section className="glass-panel p-6 sm:p-8 rounded-lg border border-white/10">
              <h2 className="font-editorial-serif text-2xl mb-1">
                Personal Information
              </h2>
              <p className="text-xs text-silver mb-6">
                Update the details we use for your orders and deliveries.
              </p>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label htmlFor="profile-name" className={labelClass}>
                    <User className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                    Full Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="profile-email" className={labelClass}>
                    <Mail className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                    Email Address
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={user.email || ''}
                    disabled
                    className={inputClass}
                  />
                  <p className="text-[11px] text-silver-dark mt-1">
                    Your email is your sign-in ID and cannot be changed here.
                  </p>
                </div>

                <div>
                  <label htmlFor="profile-phone" className={labelClass}>
                    <Phone className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                    Phone Number
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    maxLength={20}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +92 300 1234567"
                    autoComplete="tel"
                    className={inputClass}
                  />
                </div>

                <Banner type={profileMsg?.type}>{profileMsg?.text}</Banner>

                <button
                  type="submit"
                  disabled={profileSaving || !profileChanged}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-cream text-charcoal hover:bg-white text-xs font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </form>
            </section>

            {/* Change password */}
            <section className="glass-panel p-6 sm:p-8 rounded-lg border border-white/10">
              <h2 className="font-editorial-serif text-2xl mb-1">
                <Lock className="inline w-5 h-5 mr-2 -mt-1 text-cream" />
                Change Password
              </h2>
              <p className="text-xs text-silver mb-6">
                At least 8 characters, one uppercase letter and one number.
                Other devices will be signed out.
              </p>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="current-password" className={labelClass}>
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="current-password"
                      type={showPasswords ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((prev) => !prev)}
                      aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-silver hover:text-cream transition-colors"
                    >
                      {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new-password" className={labelClass}>
                      New Password
                    </label>
                    <input
                      id="new-password"
                      type={showPasswords ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className={labelClass}>
                      Confirm New Password
                    </label>
                    <input
                      id="confirm-password"
                      type={showPasswords ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className={inputClass}
                    />
                  </div>
                </div>

                <Banner type={passwordMsg?.type}>{passwordMsg?.text}</Banner>

                <button
                  type="submit"
                  disabled={
                    passwordSaving ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                  className="inline-flex items-center gap-2 px-6 py-3 bg-cream text-charcoal hover:bg-white text-xs font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </form>
            </section>
          </div>

          {/* Right column */}
          <aside className="space-y-8">
            <section className="glass-panel p-6 rounded-lg border border-white/10">
              <h2 className="font-editorial-serif text-xl mb-4">Account</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-silver">Role</dt>
                  <dd className="text-snow text-right">{formatRole(user.role)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-silver">Member since</dt>
                  <dd className="text-snow text-right">{formatDate(user.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-silver">Last sign-in</dt>
                  <dd className="text-snow text-right">{formatDate(user.lastLogin)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-silver">Email verified</dt>
                  <dd className="text-snow text-right">
                    {user.isEmailVerified ? 'Yes' : 'No'}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="glass-panel p-6 rounded-lg border border-white/10 space-y-4">
              <CouponList compact title="Your offers" />
              <div className="flex flex-wrap gap-4 pt-1 text-xs uppercase tracking-widest">
                <Link to="/notifications" className="text-ice underline-offset-4 hover:underline">All notifications</Link>
                <Link to="/notifications?tab=settings" className="text-ice underline-offset-4 hover:underline">Notification settings</Link>
              </div>
            </section>

            <section className="glass-panel p-6 rounded-lg border border-white/10 space-y-2">
              <h2 className="font-editorial-serif text-xl mb-2">Quick Links</h2>

              {isStaff && (
                <Link
                  to={user.role === 'rider' ? '/rider' : '/admin'}
                  className="flex items-center gap-3 px-3 py-3 rounded text-sm text-silver hover:text-cream hover:bg-white/5 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {user.role === 'rider' ? 'Rider Dashboard' : 'Operations Console'}
                </Link>
              )}

              <Link
                to="/my-orders"
                className="flex items-center gap-3 px-3 py-3 rounded text-sm text-silver hover:text-cream hover:bg-white/5 transition-colors"
              >
                <Package className="w-4 h-4" />
                My Orders
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-3 px-3 py-3 rounded text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-60"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
