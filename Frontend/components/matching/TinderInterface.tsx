'use client';

import React, { useState, useEffect } from 'react';
import { Heart, X, MapPin, Briefcase, GraduationCap, Users, MessageCircle, Star, ArrowLeft, RotateCcw, RefreshCw, Eye, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentModal from '../payment/PaymentModal';
import { User } from '@/lib/types/auth';
import api from '@/lib/api/auth';

// Helper function to convert UserProfile to User type for PaymentModal
const convertToUser = (profile: UserProfile): User => {
  return {
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    age: profile.age || 0,
    profilePicture: profile.profilePicture,
    bio: profile.bio,
    location: profile.location,
    isVerified: profile.isVerified || false,
    isPremium: profile.isPremium || false,
    // Required User properties with defaults
    email: `${profile.firstName.toLowerCase()}@example.com`,
    username: `${profile.firstName.toLowerCase()}_${profile.id.slice(-4)}`,
    role: 'user' as const,
    interests: [],
    registrationStage: 'completed',
    isRegistrationComplete: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

interface ProfileImageCarouselProps {
  photos: string[];
  profilePicture?: string;
  firstName: string;
  lastName: string;
}

const ProfileImageCarousel: React.FC<ProfileImageCarouselProps> = ({ 
  photos, 
  profilePicture, 
  firstName, 
  lastName 
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Combine profile picture and additional photos, ensuring no duplicates
  const allPhotos = React.useMemo(() => {
    const photoSet = new Set();
    const combinedPhotos: string[] = [];
    
    // Add profile picture first if it exists
    if (profilePicture) {
      photoSet.add(profilePicture);
      combinedPhotos.push(profilePicture);
    }
    
    // Add other photos, avoiding duplicates
    photos.forEach(photo => {
      if (!photoSet.has(photo)) {
        photoSet.add(photo);
        combinedPhotos.push(photo);
      }
    });
    
    return combinedPhotos;
  }, [photos, profilePicture]);

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  const goToPhoto = (index: number) => {
    setCurrentPhotoIndex(index);
  };

  if (allPhotos.length === 0) {
    // No photos available, show initials
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-24 h-24 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
          <span className="text-3xl font-bold text-white">
            {firstName[0]}{lastName[0]}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Main Image */}
      <img
        src={allPhotos[currentPhotoIndex]}
        alt={`${firstName}'s photo ${currentPhotoIndex + 1}`}
        className="w-full h-full object-cover"
      />

      {/* Navigation Arrows (only show if more than 1 photo) */}
      {allPhotos.length > 1 && (
        <>
          <button
            onClick={prevPhoto}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextPhoto}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Photo Indicators (only show if more than 1 photo) */}
      {allPhotos.length > 1 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {allPhotos.map((_, index) => (
            <button
              key={index}
              onClick={() => goToPhoto(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentPhotoIndex 
                  ? 'bg-white' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      )}

      {/* Photo Counter */}
      {allPhotos.length > 1 && (
        <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
          {currentPhotoIndex + 1} / {allPhotos.length}
        </div>
      )}
    </div>
  );
};

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  profilePicture?: string;
  photos?: string[];
  bio?: string;
  location?: string;
  county?: string;
  town?: string;
  profession?: string;
  education?: string;
  isVerified?: boolean;
  isPremium?: boolean;
}

interface TinderInterfaceProps {
  onBack: () => void;
}

const TinderInterface: React.FC<TinderInterfaceProps> = ({ onBack }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwipeDisabled, setIsSwipeDisabled] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [lastSwipeInfo, setLastSwipeInfo] = useState<any>(null);
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  const [profileStats, setProfileStats] = useState<any>(null);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [chatFee, setChatFee] = useState(50); // Default fee, will be fetched from admin settings

  useEffect(() => {
    fetchMatches();
    checkUndoStatus();
    fetchChatFee();
  }, [showAllProfiles]);

  useEffect(() => {
    checkUndoStatus();
  }, [currentIndex]);

  const fetchChatFee = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChatFee(data.chatFee || 50);
      }
    } catch (error) {
      console.error('Error fetching chat fee:', error);
      // Keep default fee of 50
    }
  };

  const fetchMatches = async () => {
    try {
      setIsLoading(true);
      const params = showAllProfiles ? '?include_swiped=true' : '';
      const response = await api.get(`/matching/profiles${params}`);
      
      const data = response.data;
      setProfiles(data.profiles || []);
      setProfileStats({
        totalSwiped: data.totalSwiped || 0,
        totalUnswiped: data.totalUnswiped || 0,
        includeSwiped: data.includeSwiped || false
      });
      setCurrentIndex(0); // Reset to first profile when switching modes
    } catch (error: any) {
      console.error('Error fetching matches:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load matches';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleShowAllProfiles = () => {
    setShowAllProfiles(!showAllProfiles);
    toast.success(showAllProfiles ? 'Showing only new profiles' : 'Showing all profiles');
  };

  const checkUndoStatus = async () => {
    try {
      const response = await api.get('/matching/can-undo');
      setCanUndo(response.data.canUndo);
      setLastSwipeInfo(response.data.lastSwipe);
    } catch (error) {
      console.error('Error checking undo status:', error);
    }
  };

  const handleUndo = async () => {
    if (!canUndo || isSwipeDisabled) return;

    setIsSwipeDisabled(true);

    try {
      const response = await api.post('/matching/undo-swipe');
      
      // Add the undone user back to the current position
      const undoneUser = response.data.undoneUser;
      setProfiles(prev => {
        const newProfiles = [...prev];
        newProfiles.splice(currentIndex, 0, undoneUser);
        return newProfiles;
      });

      // Update undo status
      setCanUndo(false);
      setLastSwipeInfo(null);

      toast.success(`↩️ Undid ${response.data.wasLike ? 'like' : 'pass'} on ${undoneUser.firstName}`);
    } catch (error: any) {
      console.error('Undo error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to undo swipe';
      toast.error(errorMessage);
    } finally {
      setIsSwipeDisabled(false);
    }
  };

  const handleSwipe = async (action: 'like' | 'pass') => {
    if (isSwipeDisabled || currentIndex >= profiles.length) return;

    const currentProfile = profiles[currentIndex];

    // If it's a like, show payment modal
    if (action === 'like') {
      setSelectedUser(currentProfile);
      setShowPaymentModal(true);
      return;
    }

    // Handle pass normally
    await processSwipe(action, currentProfile);
  };

  const processSwipe = async (action: 'like' | 'pass', profile: UserProfile) => {
    setIsSwipeDisabled(true);

    try {
      const response = await api.post('/matching/swipe', {
        targetUserId: profile.id,
        action
      });
      
      if (action === 'like') {
        if (response.data.isMatch) {
          toast.success(`🎉 It's a match with ${profile.firstName}! You can now chat!`);
        } else {
          toast.success(`❤️ You liked ${profile.firstName}. They'll be notified!`);
        }
      }

      // Move to next profile
      setCurrentIndex(prev => prev + 1);
      
      // Update undo status after successful swipe
      setTimeout(() => {
        checkUndoStatus();
      }, 100);
    } catch (error: any) {
      console.error('Swipe error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to record your choice';
      toast.error(errorMessage);
    } finally {
      setIsSwipeDisabled(false);
    }
  };

  const handlePaymentSuccess = () => {
    if (selectedUser) {
      // Process the like after successful payment
      processSwipe('like', selectedUser);
      toast.success(`💳 Payment successful! You can now chat with ${selectedUser.firstName}!`);
    }
    setShowPaymentModal(false);
    setSelectedUser(null);
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setSelectedUser(null);
  };

  const currentProfile = profiles[currentIndex];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Finding your matches...</p>
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-4">
        {/* Header with toggle button */}
        <div className="flex items-center justify-between mb-4 max-w-sm mx-auto">
          <button
            onClick={onBack}
            className="p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Discover
          </h1>
          <button
            onClick={toggleShowAllProfiles}
            className={`p-2 rounded-full shadow-lg hover:shadow-xl transition-all ${
              showAllProfiles 
                ? 'bg-primary-500 text-white' 
                : 'bg-white/80 backdrop-blur-sm text-gray-600'
            }`}
            title={showAllProfiles ? 'Show only new profiles' : 'Show all profiles (including viewed)'}
          >
            <Eye className="w-6 h-6" />
          </button>
        </div>

        {/* Profile Stats */}
        {profileStats && (
          <div className="max-w-sm mx-auto mb-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-lg">
              <div className="flex justify-between items-center text-sm">
                <div className="text-gray-600">
                  <span className="font-medium">{showAllProfiles ? 'All' : 'New'} Profiles</span>
                </div>
                <div className="flex space-x-4 text-xs">
                  <span className="text-green-600">
                    {profileStats.totalUnswiped} new
                  </span>
                  <span className="text-gray-500">
                    {profileStats.totalSwiped} viewed
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No More Matches Content */}
        <div className="flex items-center justify-center flex-1">
          <div className="text-center max-w-md">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mb-6">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {showAllProfiles ? 'No Profiles Available' : 'No More New Matches'}
            </h2>
            <p className="text-gray-600 mb-6">
              {showAllProfiles 
                ? 'No profiles match your current search criteria. Try adjusting your preferences.'
                : 'You\'ve seen all new matches in your area. Tap the eye icon above to revisit previous profiles or check back later for new ones!'
              }
            </p>
            {!showAllProfiles && profileStats?.totalSwiped > 0 && (
              <button
                onClick={toggleShowAllProfiles}
                className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center space-x-2 mx-auto mb-4"
              >
                <Eye className="w-5 h-5" />
                <span>View All {profileStats.totalSwiped} Previous Profiles</span>
              </button>
            )}
            <button
              onClick={onBack}
              className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center space-x-2 mx-auto"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Search</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 max-w-sm mx-auto">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
          Discover
        </h1>
        <button
          onClick={toggleShowAllProfiles}
          className={`p-2 rounded-full shadow-lg hover:shadow-xl transition-all ${
            showAllProfiles 
              ? 'bg-primary-500 text-white' 
              : 'bg-white/80 backdrop-blur-sm text-gray-600'
          }`}
          title={showAllProfiles ? 'Show only new profiles' : 'Show all profiles (including viewed)'}
        >
          <Eye className="w-6 h-6" />
        </button>
      </div>

      {/* Profile Stats */}
      {profileStats && (
        <div className="max-w-sm mx-auto mb-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 shadow-lg">
            <div className="flex justify-between items-center text-sm">
              <div className="text-gray-600">
                <span className="font-medium">{showAllProfiles ? 'All' : 'New'} Profiles</span>
              </div>
              <div className="flex space-x-4 text-xs">
                <span className="text-green-600">
                  {profileStats.totalUnswiped} new
                </span>
                <span className="text-gray-500">
                  {profileStats.totalSwiped} viewed
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="max-w-sm mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden relative">
          {/* Profile Images Carousel */}
          <div className="relative h-96 bg-gradient-to-br from-primary-100 to-secondary-100">
            <ProfileImageCarousel 
              photos={currentProfile.photos || []}
              profilePicture={currentProfile.profilePicture}
              firstName={currentProfile.firstName}
              lastName={currentProfile.lastName}
            />
            
            {/* Badges */}
            <div className="absolute top-4 right-4 flex space-x-2">
              {currentProfile.isVerified && (
                <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
                  <Star className="w-3 h-3" />
                  <span>Verified</span>
                </div>
              )}
              {currentProfile.isPremium && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                  Premium
                </div>
              )}
            </div>

            {/* Profile Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
              <h2 className="text-2xl font-bold text-white mb-1">
                {currentProfile.firstName} {currentProfile.lastName}
              </h2>
              <p className="text-white/90 text-lg">{currentProfile.age} years old</p>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-6 space-y-4">
            {currentProfile.bio && (
              <div>
                <p className="text-gray-700 leading-relaxed">{currentProfile.bio}</p>
              </div>
            )}

            <div className="space-y-3">
              {(currentProfile.location || currentProfile.town) && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-primary-600" />
                  <span className="text-gray-700">
                    {currentProfile.location || `${currentProfile.town}, ${currentProfile.county}`}
                  </span>
                </div>
              )}

              {currentProfile.profession && (
                <div className="flex items-center space-x-3">
                  <Briefcase className="w-5 h-5 text-primary-600" />
                  <span className="text-gray-700">{currentProfile.profession}</span>
                </div>
              )}

              {currentProfile.education && (
                <div className="flex items-center space-x-3">
                  <GraduationCap className="w-5 h-5 text-primary-600" />
                  <span className="text-gray-700">{currentProfile.education}</span>
                </div>
              )}
            </div>

            {/* Chat Fee Notice */}
            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-primary-600" />
                <span className="text-sm text-primary-700 font-medium">
                  Pay KSh {chatFee} to start chatting
                </span>
              </div>
              <p className="text-xs text-primary-600 mt-1">
                One-time payment to unlock messaging with {currentProfile.firstName}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center items-center space-x-3 mt-6">
          {/* Undo Button */}
          {canUndo && (
            <button
              onClick={handleUndo}
              disabled={isSwipeDisabled}
              className="w-10 h-10 bg-yellow-500 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
              title={`Undo ${lastSwipeInfo?.wasLike ? 'like' : 'pass'} on ${lastSwipeInfo?.targetUser?.firstName}`}
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Pass Button */}
          <button
            onClick={() => handleSwipe('pass')}
            disabled={isSwipeDisabled}
            className="w-12 h-12 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <X className="w-6 h-6 text-gray-500 group-hover:text-red-500 transition-colors" />
          </button>

          {/* Like Button with Payment Icon */}
          <button
            onClick={() => handleSwipe('like')}
            disabled={isSwipeDisabled}
            className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed relative"
          >
            <Heart className="w-6 h-6 text-white" />
            <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
              <CreditCard className="w-3 h-3" />
            </div>
          </button>
        </div>

        {/* Undo Info */}
        {canUndo && lastSwipeInfo && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              You {lastSwipeInfo.wasLike ? 'liked' : 'passed on'} {lastSwipeInfo.targetUser?.firstName}
            </p>
            <p className="text-xs text-yellow-600 font-medium">
              Tap ↻ to undo
            </p>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {currentIndex + 1} of {profiles.length} profiles
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / profiles.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedUser && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={handlePaymentCancel}
          targetUser={convertToUser(selectedUser)}
          onPaymentSuccess={handlePaymentSuccess}
          amount={chatFee}
        />
      )}
    </div>
  );
};

export default TinderInterface;
