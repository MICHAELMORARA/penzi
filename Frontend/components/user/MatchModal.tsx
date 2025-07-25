'use client';

import React from 'react';
import { Heart, MessageCircle, X } from 'lucide-react';
import { Match } from '@/lib/types/auth';

interface MatchModalProps {
  match: Match;
  onClose: () => void;
  onStartChat: () => void;
}

const MatchModal: React.FC<MatchModalProps> = ({ match, onClose, onStartChat }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary-500 to-secondary-500 p-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Heart className="h-16 w-16 text-white animate-pulse" />
              <div className="absolute inset-0 h-16 w-16 border-4 border-white/30 rounded-full animate-ping"></div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">It's a Match!</h2>
          <p className="text-white/90">You and {match.matchedUser.firstName} liked each other</p>
        </div>

        {/* Profile Images */}
        <div className="flex justify-center items-center py-8 bg-gray-50">
          <div className="flex items-center space-x-4">
            {/* Current User */}
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-200 to-secondary-200 rounded-full overflow-hidden">
                {match.user.profilePicture ? (
                  <img
                    src={match.user.profilePicture}
                    alt={`${match.user.firstName} ${match.user.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-600">
                      {match.user.firstName[0]}{match.user.lastName[0]}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Heart Icon */}
            <div className="p-2 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full">
              <Heart className="h-6 w-6 text-white fill-current" />
            </div>

            {/* Matched User */}
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-200 to-secondary-200 rounded-full overflow-hidden">
                {match.matchedUser.profilePicture ? (
                  <img
                    src={match.matchedUser.profilePicture}
                    alt={`${match.matchedUser.firstName} ${match.matchedUser.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-600">
                      {match.matchedUser.firstName[0]}{match.matchedUser.lastName[0]}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 pb-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {match.matchedUser.firstName} {match.matchedUser.lastName}
            </h3>
            {match.matchedUser.age && (
              <p className="text-gray-600">{match.matchedUser.age} years old</p>
            )}
            {match.matchedUser.location && (
              <p className="text-gray-600">{match.matchedUser.location}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onStartChat}
              className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-3 px-4 rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Start Chatting</span>
            </button>
            
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Keep Swiping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchModal;