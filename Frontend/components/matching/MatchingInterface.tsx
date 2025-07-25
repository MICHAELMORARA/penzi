'use client';

import React, { useState, useEffect } from 'react';
import { Heart, Settings, Filter, Users, Sparkles } from 'lucide-react';
import { User } from '@/lib/types/auth';
import SwipeCard from './SwipeCard';
import PaymentModal from '../payment/PaymentModal';
import RegistrationCompletion from './RegistrationCompletion';

interface MatchingInterfaceProps {
  className?: string;
}

interface MatchCriteria {
  ageMin: number;
  ageMax: number;
  location: string;
}

const MatchingInterface: React.FC<MatchingInterfaceProps> = ({ className = '' }) => {
  const [potentialMatches, setPotentialMatches] = useState<User[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRegistrationCompletion, setShowRegistrationCompletion] = useState(false);
  const [showMatchCriteria, setShowMatchCriteria] = useState(false);
  const [matchCriteria, setMatchCriteria] = useState<MatchCriteria>({
    ageMin: 18,
    ageMax: 35,
    location: ''
  });
  const [registrationStatus, setRegistrationStatus] = useState<any>(null);

  useEffect(() => {
    checkRegistrationStatus();
  }, []);

  const checkRegistrationStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/matching/registration-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const status = await response.json();
        setRegistrationStatus(status);
        
        if (!status.canAccessMatches) {
          setShowRegistrationCompletion(true);
        } else {
          fetchPotentialMatches();
        }
      } else if (response.status === 422) {
        const error = await response.json();
        if (error.requiresCompletion) {
          setShowRegistrationCompletion(true);
        }
      }
    } catch (error) {
      console.error('Failed to check registration status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPotentialMatches = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/matching/potential', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const matches = await response.json();
        setPotentialMatches(matches);
        setCurrentMatchIndex(0);
      } else if (response.status === 422) {
        const error = await response.json();
        if (error.requiresCompletion) {
          setShowRegistrationCompletion(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch potential matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestMatches = async () => {
    if (!matchCriteria.location.trim()) {
      alert('Please enter a location');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/matching/request-matches', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(matchCriteria)
      });

      if (response.ok) {
        const result = await response.json();
        setPotentialMatches(result.matches || []);
        setCurrentMatchIndex(0);
        setShowMatchCriteria(false);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to find matches');
      }
    } catch (error) {
      console.error('Failed to request matches:', error);
      alert('Failed to find matches. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwipe = async (action: 'like' | 'pass') => {
    const currentUser = potentialMatches[currentMatchIndex];
    if (!currentUser) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/matching/swipe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: currentUser.id,
          action: action
        })
      });

      const result = await response.json();

      if (response.ok) {
        if (result.requiresPayment && action === 'like') {
          setSelectedUser(currentUser);
          setShowPaymentModal(true);
        } else {
          // Move to next match
          moveToNextMatch();
          
          if (result.isMatch) {
            // Show match notification
            alert(`It's a match with ${currentUser.firstName}! 🎉`);
          }
        }
      }
    } catch (error) {
      console.error('Swipe action failed:', error);
    }
  };

  const handlePaymentRequired = (user: User) => {
    setSelectedUser(user);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    // Move to next match after successful payment
    moveToNextMatch();
    alert(`Payment successful! You can now chat with ${selectedUser?.firstName} 💬`);
  };

  const moveToNextMatch = () => {
    if (currentMatchIndex < potentialMatches.length - 1) {
      setCurrentMatchIndex(currentMatchIndex + 1);
    } else {
      // No more matches, fetch new ones or show empty state
      setPotentialMatches([]);
      setCurrentMatchIndex(0);
    }
  };

  const handleRegistrationComplete = () => {
    setShowRegistrationCompletion(false);
    fetchPotentialMatches();
  };

  if (showRegistrationCompletion) {
    return <RegistrationCompletion onComplete={handleRegistrationComplete} />;
  }

  const currentMatch = potentialMatches[currentMatchIndex];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Heart className="h-8 w-8 text-primary-500" />
              <h1 className="text-2xl font-bold text-gray-900">Find Your Match</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowMatchCriteria(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </button>
              
              <button
                onClick={fetchPotentialMatches}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Finding your perfect matches...</p>
            </div>
          </div>
        ) : currentMatch ? (
          <div className="flex justify-center">
            <SwipeCard
              user={currentMatch}
              onSwipe={handleSwipe}
              onPaymentRequired={handlePaymentRequired}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No More Matches</h3>
            <p className="text-gray-600 mb-6">
              You've seen all available matches. Try adjusting your criteria or check back later!
            </p>
            <button
              onClick={() => setShowMatchCriteria(true)}
              className="bg-primary-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
            >
              Find New Matches
            </button>
          </div>
        )}

        {/* Match Counter */}
        {potentialMatches.length > 0 && (
          <div className="text-center mt-6">
            <p className="text-gray-600">
              {currentMatchIndex + 1} of {potentialMatches.length} matches
            </p>
          </div>
        )}
      </div>

      {/* Match Criteria Modal */}
      {showMatchCriteria && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Find Matches</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age Range
                </label>
                <div className="flex space-x-3">
                  <input
                    type="number"
                    value={matchCriteria.ageMin}
                    onChange={(e) => setMatchCriteria({
                      ...matchCriteria,
                      ageMin: parseInt(e.target.value) || 18
                    })}
                    min="18"
                    max="100"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Min"
                  />
                  <span className="self-center text-gray-500">to</span>
                  <input
                    type="number"
                    value={matchCriteria.ageMax}
                    onChange={(e) => setMatchCriteria({
                      ...matchCriteria,
                      ageMax: parseInt(e.target.value) || 35
                    })}
                    min="18"
                    max="100"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={matchCriteria.location}
                  onChange={(e) => setMatchCriteria({
                    ...matchCriteria,
                    location: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Nairobi, Westlands"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowMatchCriteria(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={requestMatches}
                disabled={isLoading}
                className="flex-1 bg-primary-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Searching...' : 'Find Matches'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        targetUser={selectedUser!}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default MatchingInterface;