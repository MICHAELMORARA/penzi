'use client';

import React, { useState, useEffect } from 'react';
import WelcomeScreen from '@/components/WelcomeScreen';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { clearAuthData, hasValidAuth, forceLogout } from '@/lib/utils/authUtils';

export default function Page() {
  const { state: authState, logout } = useAuth();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(true);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
  };

  useEffect(() => {
    // Wait for authentication check to complete
    if (authState.isLoading) {
      return;
    }

    // If user is authenticated, redirect based on their status
    if (authState.isAuthenticated && authState.user) {
      // Check if user needs registration
      const needsRegistration = (
        authState.user.isRegistrationComplete === false ||
        authState.user.registrationStage !== 'completed'
      );

      if (needsRegistration) {
        router.push('/registration');
      } else if (authState.user.role === 'admin') {
        router.push('/dashboard');
      } else {
        router.push('/matches');
      }
      return;
    }

    // For non-authenticated users, show welcome screen first, then redirect to login
    if (!showWelcome && !authState.isAuthenticated) {
      router.push('/login');
    }
  }, [showWelcome, authState.isAuthenticated, authState.isLoading, authState.user, router]);

  // Show welcome screen first for new users
  if (showWelcome) {
    return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  }

  // Show loading while checking authentication and redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}