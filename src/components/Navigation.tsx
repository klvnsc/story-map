'use client';

import { useRouter, usePathname } from 'next/navigation';
import { logout } from '@/lib/auth';

interface NavigationProps {
  user: { username: string } | null;
}

export default function Navigation({ user }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navItems = [
    { name: 'Stories', href: '/stories', icon: '📚' },
    { name: 'Collections', href: '/collections', icon: '📁' },
    { name: 'Map', href: '/map', icon: '🗺️' },
    { name: 'Timeline', href: '/timeline', icon: '🗓️' },
    { name: 'Manage', href: '/manage', icon: '⚙️', disabled: true },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900">
                Story Archive
              </h1>
            </div>
            
            {/* Main Navigation */}
            <nav className="hidden md:ml-8 md:flex md:space-x-1">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => !item.disabled && router.push(item.href)}
                  disabled={item.disabled}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'bg-indigo-100 text-indigo-700'
                      : item.disabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.name}
                  {item.disabled && (
                    <span className="ml-1 text-xs text-gray-400">(Soon)</span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Right side - Search and User Menu */}
          <div className="flex items-center space-x-4">
            {/* Global Search - Future Enhancement */}
            <div className="hidden lg:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search stories..."
                  className="w-64 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-gray-400">🔍</span>
                </div>
              </div>
            </div>

            {/* User Menu */}
            {user && (
              <>
                <span className="text-gray-700 text-sm">
                  Welcome, {user.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => !item.disabled && router.push(item.href)}
                disabled={item.disabled}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                  isActive(item.href)
                    ? 'bg-indigo-100 text-indigo-700'
                    : item.disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
                {item.disabled && (
                  <span className="ml-2 text-sm text-gray-400">(Coming Soon)</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}