'use client';

import React, { useState, useEffect } from 'react';
import MatchRequestForm from '@/components/matching/MatchRequestForm';
import TinderInterface from '@/components/matching/TinderInterface';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function MatchesPage() {
  const { state: authState } = useAuth();
  const router = useRouter();
  const [showMatchRequest, setShowMatchRequest] = useState(true);

  useEffect(() => {
    // Redirect if not authenticated
    if (!authState.isAuthenticated && !authState.isLoading) {
      router.push('/login');
      return;
    }

    // Check if user needs registration
    const needsRegistration = authState.user && (
      authState.user.isRegistrationComplete === false ||
      authState.user.registrationStage !== 'completed'
    );

    if (needsRegistration) {
      router.push('/registration');
      return;
    }
  }, [authState.isAuthenticated, authState.isLoading, authState.user, router]);

  // Show loading while checking authentication
  if (authState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or needs registration
  if (!authState.isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  const needsRegistration = authState.user && (
    authState.user.isRegistrationComplete === false ||
    authState.user.registrationStage !== 'completed'
  );

  if (needsRegistration) {
    return null; // Will redirect in useEffect
  }

  const handleMatchRequestComplete = () => {
    setShowMatchRequest(false);
  };

  const handleBackToMatchRequest = () => {
    setShowMatchRequest(true);
  };

  if (showMatchRequest) {
    return <MatchRequestForm onComplete={handleMatchRequestComplete} />;
  }

  return <TinderInterface onBack={handleBackToMatchRequest} />;
}