import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

const mobileLinks = [
  { to: '/dashboard', label: 'Home', icon: '📊' },
  { to: '/generate', label: 'Generate', icon: '✨' },
  { to: '/records', label: 'Records', icon: '📁' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export const DashboardLayout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-gray-50 pb-16 dark:bg-gray-950 lg:pb-0">
    <Navbar />
    <div className="mx-auto flex max-w-7xl">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 lg:hidden">
      {mobileLinks.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center py-2 text-xs ${
              isActive ? 'text-primary-600' : 'text-gray-500'
            }`
          }
        >
          <span className="text-lg">{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
    </nav>
  </div>
);
