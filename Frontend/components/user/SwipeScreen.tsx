'use client';

import React, { useState, useEffect } from 'react';
import { Heart, Settings, User as UserIcon, MessageCircle, LogOut } from 'lucide-react';
import SwipeCard from './SwipeCard';
import MatchModal from './MatchModal';
import ProfileModal from './ProfileModal';
import PaymentModal from './PaymentModal';
import UserProfile from './UserProfile';
import ChatScreen from './ChatScreen';
import { User, Match } from '@/lib/types/auth';
import { matchingApi } from '@/lib/api/matching';
import { useAuth } from '@/lib/context/AuthContext';
import toast from 'react-hot-toast';

const SwipeScreen: React.FC = () => {
  const { state: authState, logout } = useAuth();
  const [currentView, setCurrentView] = useState<'swipe' | 'chat' | 'profile'>('swipe');
  const [potentialMatches, setPotentialMatches] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [swipeCount, setSwipeCount] = useState(0);

  useEffect(() => {
    loadPotentialMatches();
  }, []);

  const loadPotentialMatches = async () => {
    try {
      setIsLoading(true);
      const matches = await matchingApi.getPotentialMatches();
      setPotentialMatches(matches);
      setCurrentIndex(0);
    } catch (error) {
      toast.error('Failed to load potential matches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwipe = async (action: 'like' | 'pass') => {
    if (currentIndex >= potentialMatches.length) return;

    const currentUser = potentialMatches[currentIndex];
    
    // Check if user needs to pay for premium features
    if (!authState.user?.isPremium && swipeCount >= 10) {
      setShowPaymentModal(true);
      return;
    }

    try {
      const result = await matchingApi.swipe({
        userId: authState.user!.id,
        targetUserId: currentUser.id,
        action,
      });

      setSwipeCount(prev => prev + 1);

      if (result.isMatch && result.match) {
        setCurrentMatch(result.match);
        setShowMatchModal(true);
      }

      // Move to next card
      setCurrentIndex(prev => prev + 1);

      // Load more matches if running low
      if (currentIndex >= potentialMatches.length - 2) {
        loadPotentialMatches();
      }
    } catch (error) {
      toast.error('Failed to process swipe');
    }
  };

  const handleViewProfile = () => {
    if (currentIndex < potentialMatches.length) {
      setSelectedUser(potentialMatches[currentIndex]);
      setShowProfileModal(true);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    toast.success('Premium upgrade successful! Continue swiping!');
    // Continue with the swipe action
  };

  const currentUser = currentIndex < potentialMatches.length ? potentialMatches[currentIndex] : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Finding your perfect matches...</p>
        </div>
      </div>
    );
  }

  // Render chat screen
  if (currentView === 'chat') {
    return <ChatScreen onBack={() => setCurrentView('swipe')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Penzi</h1>
              <p className="text-xs text-gray-600">Find your match</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setCurrentView('chat')}
              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <MessageCircle className="h-6 w-6" />
            </button>
            <button 
              onClick={() => setShowUserProfile(true)}
              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <UserIcon className="h-6 w-6" />
            </button>
            <button 
              onClick={logout}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-8">
        {currentUser ? (
          <SwipeCard
            user={currentUser}
            onSwipe={handleSwipe}
            onViewProfile={handleViewProfile}
          />
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No More Matches</h2>
            <p className="text-gray-600 mb-8">
              You've seen all available matches in your area. Check back later for new profiles!
            </p>
            <button
              onClick={loadPotentialMatches}
              className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
            >
              Refresh Matches
            </button>
          </div>
        )}

        {/* Swipe Counter for Free Users */}
        {!authState.user?.isPremium && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Free swipes: {Math.max(0, 10 - swipeCount)}/10
            </p>
            {swipeCount >= 8 && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="mt-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                Upgrade to Premium for unlimited swipes
              </button>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {showMatchModal && currentMatch && (
        <MatchModal
          match={currentMatch}
          onClose={() => setShowMatchModal(false)}
          onStartChat={() => {
            setShowMatchModal(false);
            // Navigate to chat
          }}
        />
      )}

      {showProfileModal && selectedUser && (
        <ProfileModal
          user={selectedUser}
          onClose={() => setShowProfileModal(false)}
          onLike={() => handleSwipe('like')}
          onPass={() => handleSwipe('pass')}
        />
      )}

      {showPaymentModal && (
        <PaymentModal
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          feature="unlimited_swipes"
        />
      )}

      {showUserProfile && (
        <UserProfile
          onClose={() => setShowUserProfile(false)}
        />
      )}
    </div>
  );
};

export default SwipeScreen;