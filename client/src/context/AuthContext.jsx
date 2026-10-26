import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, cartApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('ww_access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await authApi.getMe();
      // Backend responds with { data: { user } }
      const userData = res.data?.data?.user || res.data?.user || res.data?.data || res.data;
      setUser(userData);
    } catch (err) {
      console.warn('[AuthContext] Session expired or invalid token');
      localStorage.removeItem('ww_access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const res = await authApi.login(credentials);
      const data = res.data?.data || res.data;
      const token = data.accessToken || data.token;
      const userData = data.user || data;

      if (token) {
        localStorage.setItem('ww_access_token', token);
      }
      setUser(userData);

      // Merge guest cart items into user cart upon login
      try {
        await cartApi.mergeCart();
      } catch (mergeErr) {
        console.warn('[AuthContext] Guest cart merge notice:', mergeErr.message);
      }

      return { success: true, user: userData };
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userDataInput) => {
    setLoading(true);
    try {
      const res = await authApi.register(userDataInput);
      const data = res.data?.data || res.data;
      const token = data.accessToken || data.token;
      const userData = data.user || data;

      if (token) {
        localStorage.setItem('ww_access_token', token);
      }
      setUser(userData);

      try {
        await cartApi.mergeCart();
      } catch (mergeErr) {
        console.warn('[AuthContext] Guest cart merge notice:', mergeErr.message);
      }

      return { success: true, user: userData };
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('[AuthContext] Logout call returned error, clearing local state:', err.message);
    } finally {
      localStorage.removeItem('ww_access_token');
      localStorage.removeItem('ww_user');
      setUser(null);
    }
  };

  const updateUser = (patch) => setUser((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
        refreshUser: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
