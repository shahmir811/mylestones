'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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

  if (!isClient || !authenticated || pathname === '/login') {
    return null;
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
