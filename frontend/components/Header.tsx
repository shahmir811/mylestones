'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, logout } from '@/lib/auth';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setAuthenticated(isAuthenticated());
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      // Even if logout fails, redirect to login
      router.push('/login');
    }
  };

  // During SSR, return null to match initial client render
  // After hydration, conditionally render based on auth state
  if (!isClient) {
    return null;
  }

  if (!authenticated) {
    // Show navigation for unauthenticated users
    if (pathname === '/login' || pathname === '/register') {
      return null; // Don't show header on login/register pages
    }
    return (
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end items-center h-16 gap-4">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="text-sm bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end items-center h-16">
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
