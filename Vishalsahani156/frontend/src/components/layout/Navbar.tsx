import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../common/Button';

export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-700 dark:bg-gray-900/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary-600">
          <span className="text-2xl">📄</span>
          PDF Generator
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {isAuthenticated ? (
            <>
              <span className="hidden text-sm text-gray-600 dark:text-gray-400 sm:inline">
                Hi, {user?.name}
              </span>
              <Link to="/dashboard">
                <Button variant="outline" className="text-xs sm:text-sm">
                  Dashboard
                </Button>
              </Link>
              <Button variant="secondary" onClick={logout} className="text-xs sm:text-sm">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline" className="text-xs sm:text-sm">
                  Login
                </Button>
              </Link>
              <Link to="/super-admin/login">
                <Button variant="secondary" className="text-xs sm:text-sm">
                  Super Admin
                </Button>
              </Link>
              <Link to="/register">
                <Button className="text-xs sm:text-sm">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
