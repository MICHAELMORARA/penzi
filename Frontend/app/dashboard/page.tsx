'use client';

import React, { useEffect } from 'react';
import Dashboard from '@/components/Dashboard';
import { AppProvider } from '@/lib/context/AppContext';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { state: authState } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not authenticated
    if (!authState.isAuthenticated && !authState.isLoading) {
      router.push('/login');
      return;
    }

    // Check if user is admin
    if (authState.user && authState.user.role !== 'admin') {
      router.push('/matches');
      return;
    }
  }, [authState.isAuthenticated, authState.isLoading, authState.user, router]);

  // Show loading while checking authentication
  if (authState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not admin
  if (!authState.isAuthenticated || authState.user?.role !== 'admin') {
    return null; // Will redirect in useEffect
  }

  return (
    <AppProvider>
      <Dashboard />
    </AppProvider>
  );
}