import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthAPI } from '../api/endpoints';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Admin-panel roles only.
const ADMIN_ROLES = ['admin', 'super_admin'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!localStorage.getItem('accessToken')) { setLoading(false); return; }
    try {
      const { data } = await AuthAPI.me();
      if (ADMIN_ROLES.includes(data.data.role)) setUser(data.data);
      else { localStorage.clear(); setUser(null); }
    } catch {
      localStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const login = async (phone, code) => {
    const { data } = await AuthAPI.verifyOtp(phone, code);
    const { accessToken, refreshToken, user: u } = data.data;
    if (!ADMIN_ROLES.includes(u.role)) {
      const err = new Error('This account does not have admin access.');
      err.code = 'NOT_ADMIN';
      throw err;
    }
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(u);
    return u;
  };

  const logout = async () => {
    try { await AuthAPI.logout(localStorage.getItem('refreshToken')); } catch { /* ignore */ }
    localStorage.clear();
    setUser(null);
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const can = (perm) => {
    // Super admin can do everything; admins are limited.
    if (isSuperAdmin) return true;
    const ADMIN_DENIED = ['settings', 'admins', 'audit'];
    return !ADMIN_DENIED.includes(perm);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isSuperAdmin, can }}>
      {children}
    </AuthContext.Provider>
  );
}
