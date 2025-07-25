'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Heart, X, MapPin, Briefcase, GraduationCap, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { User } from '@/lib/types/auth';
import { getImageUrl, getDefaultAvatarUrl, getSampleImageUrl } from '@/lib/utils/imageUtils';

interface SwipeCardProps {
  user: User;
  onSwipe: (action: 'like' | 'pass') => void;
  onPaymentRequired: (user: User) => void;
  isLoading?: boolean;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ user, onSwipe, onPaymentRequired, isLoading = false }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  // Mock images - in production, these would come from the user's profile
  const images = [
    getImageUrl(user.profilePicture) || getDefaultAvatarUrl(),
    getSampleImageUrl(1),
    getSampleImageUrl(2),
    getSampleImageUrl(3)
  ].filter(Boolean);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLoading) return;
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isLoading) return;
    
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleMouseUp = () => {
    if (!isDragging || isLoading) return;
    
    const threshold = 100;
    
    if (Math.abs(dragOffset.x) > threshold) {
      if (dragOffset.x > 0) {
        handleLike();
      } else {
        handlePass();
      }
    }
    
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleLike = () => {
    if (isLoading) return;
    // Show payment prompt for likes
    setShowPaymentPrompt(true);
  };

  const handlePass = () => {
    if (isLoading) return;
    onSwipe('pass');
  };

  const handlePaymentConfirm = () => {
    setShowPaymentPrompt(false);
    onPaymentRequired(user);
  };

  const handlePaymentCancel = () => {
    setShowPaymentPrompt(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const getCardStyle = () => {
    if (!isDragging) return {};
    
    const rotation = dragOffset.x * 0.1;
    const opacity = 1 - Math.abs(dragOffset.x) / 300;
    
    return {
      transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
      opacity: Math.max(0.5, opacity)
    };
  };

  const getOverlayStyle = () => {
    if (!isDragging) return { opacity: 0 };
    
    const intensity = Math.min(Math.abs(dragOffset.x) / 100, 1);
    return { opacity: intensity };
  };

  return (
    <>
      <div
        ref={cardRef}
        className={`relative w-full max-w-sm mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden cursor-grab ${
          isDragging ? 'cursor-grabbing' : ''
        } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
        style={getCardStyle()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Image Section */}
        <div className="relative h-96 bg-gray-200">
          <img
            src={images[currentImageIndex]}
            alt={`${user.firstName} ${user.lastName}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getDefaultAvatarUrl();
            }}
          />
          
          {/* Image Navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              
              {/* Image Indicators */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-1">
                {images.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
          
          {/* Swipe Overlays */}
          <div
            className="absolute inset-0 bg-green-500 bg-opacity-70 flex items-center justify-center"
            style={{
              ...getOverlayStyle(),
              display: dragOffset.x > 0 ? 'flex' : 'none'
            }}
          >
            <Heart className="h-16 w-16 text-white" />
          </div>
          
          <div
            className="absolute inset-0 bg-red-500 bg-opacity-70 flex items-center justify-center"
            style={{
              ...getOverlayStyle(),
              display: dragOffset.x < 0 ? 'flex' : 'none'
            }}
          >
            <X className="h-16 w-16 text-white" />
          </div>
        </div>

        {/* Profile Info */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h3>
            <span className="text-xl text-gray-600">{user.age}</span>
          </div>

          <div className="space-y-2 mb-6">
            {user.location && (
              <div className="flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-2" />
                <span className="text-sm">{user.location}</span>
              </div>
            )}
            
            <div className="flex items-center text-gray-600">
              <Briefcase className="h-4 w-4 mr-2" />
              <span className="text-sm">Professional</span>
            </div>
            
            <div className="flex items-center text-gray-600">
              <GraduationCap className="h-4 w-4 mr-2" />
              <span className="text-sm">Graduate</span>
            </div>
          </div>

          {user.bio && (
            <p className="text-gray-700 text-sm mb-6 line-clamp-3">{user.bio}</p>
          )}

          {user.interests && user.interests.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {user.interests.slice(0, 3).map((interest, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium"
                  >
                    {interest}
                  </span>
                ))}
                {user.interests.length > 3 && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    +{user.interests.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={handlePass}
              disabled={isLoading}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <X className="h-5 w-5 mr-2" />
              Pass
            </button>
            <button
              onClick={handleLike}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-3 px-4 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center"
            >
              <Heart className="h-5 w-5 mr-2" />
              Like
            </button>
          </div>
        </div>
      </div>

      {/* Payment Prompt Modal */}
      {showPaymentPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-6">
              <CreditCard className="h-12 w-12 text-primary-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Express Interest</h3>
              <p className="text-gray-600">
                To express interest in {user.firstName}, a small fee is required to ensure serious connections.
              </p>
            </div>

            <div className="bg-primary-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Connection Fee</span>
                <span className="text-2xl font-bold text-primary-600">KES 50</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                One-time payment to start chatting
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handlePaymentCancel}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentConfirm}
                className="flex-1 bg-primary-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors"
              >
                Pay & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SwipeCard;