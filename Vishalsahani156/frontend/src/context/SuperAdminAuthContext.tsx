import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { superAdminLoginApi, superAdminMeApi, superAdminRegisterApi, SuperAdmin } from '../api/superAdmin.api';

type SuperAdminAuthContextType = {
  admin: SuperAdmin | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; registrationKey?: string }) => Promise<void>;
  logout: () => void;
};

const SuperAdminAuthContext = createContext<SuperAdminAuthContextType | undefined>(undefined);

export const SuperAdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<SuperAdmin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persist = (nextAdmin: SuperAdmin, nextToken: string) => {
    setAdmin(nextAdmin);
    setToken(nextToken);
    localStorage.setItem('superAdminToken', nextToken);
    localStorage.setItem('superAdmin', JSON.stringify(nextAdmin));
  };

  const logout = useCallback(() => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdmin');
  }, []);

  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem('superAdminToken');
      const storedAdmin = localStorage.getItem('superAdmin');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      setToken(storedToken);
      if (storedAdmin) {
        setAdmin(JSON.parse(storedAdmin));
      }

      try {
        const me = await superAdminMeApi();
        setAdmin(me);
        localStorage.setItem('superAdmin', JSON.stringify(me));
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [logout]);

  const login = async (email: string, password: string) => {
    const res = await superAdminLoginApi({ email, password });
    persist(res.admin, res.token);
  };

  const register = async (data: {
    username: string;
    email: string;
    password: string;
    registrationKey?: string;
  }) => {
    const res = await superAdminRegisterApi(data);
    persist(res.admin, res.token);
  };

  return (
    <SuperAdminAuthContext.Provider
      value={{
        admin,
        token,
        isLoading,
        isAuthenticated: !!token && !!admin,
        login,
        register,
        logout,
      }}
    >
      {children}
    </SuperAdminAuthContext.Provider>
  );
};

export const useSuperAdminAuth = () => {
  const ctx = useContext(SuperAdminAuthContext);
  if (!ctx) throw new Error('useSuperAdminAuth must be used within SuperAdminAuthProvider');
  return ctx;
};

