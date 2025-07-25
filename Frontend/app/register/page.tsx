'use client';

import React, { useEffect } from 'react';
import RegisterForm from '@/components/auth/RegisterForm';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';

export default function RegisterPage() {
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

  const handleSwitchToLogin = () => {
    router.push('/login');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <RegisterForm onSwitchToLogin={handleSwitchToLogin} />
      </div>
    </div>
  );
}