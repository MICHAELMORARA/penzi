'use client';

import React from 'react';
import { X, Heart, MapPin, Calendar, Star, Flag } from 'lucide-react';
import { User } from '@/lib/types/auth';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onLike: () => void;
  onPass: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onLike, onPass }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header with close button */}
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-black/20 text-white p-2 rounded-full hover:bg-black/30 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          {/* Profile Image */}
          <div className="relative h-80 bg-gradient-to-br from-primary-200 to-secondary-200">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-32 h-32 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-600">
                    {user.firstName[0]}{user.lastName[0]}
                  </span>
                </div>
              </div>
            )}
            
            {/* Premium Badge */}
            {user.isPremium && (
              <div className="absolute top-4 left-4 bg-yellow-500 text-white px-3 py-1 rounded-full flex items-center space-x-1">
                <Star className="h-4 w-4" />
                <span className="text-sm font-medium">Premium</span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="max-h-96 overflow-y-auto">
          <div className="p-6">
            {/* Basic Info */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                </h2>
                {user.age && (
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{user.age}</span>
                  </div>
                )}
              </div>

              {user.location && (
                <div className="flex items-center text-gray-600 mb-3">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{user.location}</span>
                </div>
              )}

              {user.isVerified && (
                <div className="inline-flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Verified Profile
                </div>
              )}
            </div>

            {/* Bio */}
            {user.bio && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
                <p className="text-gray-700 leading-relaxed">{user.bio}</p>
              </div>
            )}

            {/* Interests */}
            {user.interests && user.interests.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {user.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Report Button */}
            <div className="mb-6">
              <button className="flex items-center text-gray-500 hover:text-red-500 transition-colors">
                <Flag className="h-4 w-4 mr-2" />
                <span className="text-sm">Report this profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 p-6 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onPass}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <X className="h-5 w-5" />
            <span>Pass</span>
          </button>
          
          <button
            onClick={onLike}
            className="flex-1 bg-gradient-to-r from-primary-500 to-secondary-500 hover:shadow-lg text-white py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
          >
            <Heart className="h-5 w-5" />
            <span>Like</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;