'use client';

import React from 'react';
import AuthScreen from '@/components/auth/AuthScreen';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { state: authState } = useAuth();

  useEffect(() => {
    // Redirect if already authenticated
    if (authState.isAuthenticated && !authState.isLoading) {
      // Check if user needs registration
      const needsRegistration = authState.user && (
        authState.user.isRegistrationComplete === false ||
        authState.user.registrationStage !== 'completed'
      );

      if (needsRegistration) {
        router.push('/registration');
      } else {
        router.push('/matches');
      }
    }
  }, [authState.isAuthenticated, authState.isLoading, authState.user, router]);

  const handleAuthComplete = () => {
    // Check if user needs registration
    const needsRegistration = authState.user && (
      authState.user.isRegistrationComplete === false ||
      authState.user.registrationStage !== 'completed'
    );

    if (needsRegistration) {
      router.push('/registration');
    } else {
      router.push('/matches');
    }
  };

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

  return <AuthScreen onComplete={handleAuthComplete} />;
}