import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { User } from '../types';
import { loginApi, registerApi } from '../api/auth.api';
import { getProfileApi } from '../api/user.api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistAuth = (authUser: User, authToken: string) => {
    setUser(authUser);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(authUser));
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      setToken(storedToken);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      try {
        const { data } = await getProfileApi();
        const profile = data.data;
        const normalizedUser: User = {
          id: (profile as User & { _id?: string })._id || profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          createdAt: profile.createdAt,
        };
        setUser(normalizedUser);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [logout]);

  const login = async (email: string, password: string) => {
    const { data } = await loginApi({ email, password });
    const { user: authUser, token: authToken } = data.data;
    const normalizedUser: User = {
      id: (authUser as User & { _id?: string })._id || authUser.id,
      name: authUser.name,
      email: authUser.email,
      phone: authUser.phone,
    };
    persistAuth(normalizedUser, authToken);
  };

  const register = async (registerData: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    const { data } = await registerApi(registerData);
    const { user: authUser, token: authToken } = data.data;
    const normalizedUser: User = {
      id: (authUser as User & { _id?: string })._id || authUser.id,
      name: authUser.name,
      email: authUser.email,
      phone: authUser.phone,
    };
    persistAuth(normalizedUser, authToken);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
