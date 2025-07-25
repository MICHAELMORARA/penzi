'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Search, MapPin, Users, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api/auth';

interface MatchRequestData {
  ageMin: number;
  ageMax: number;
  preferredTown: string;
}

interface MatchRequestFormProps {
  onComplete: () => void;
}

const MatchRequestForm: React.FC<MatchRequestFormProps> = ({ onComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<MatchRequestData>();

  const ageMin = watch('ageMin');
  const ageMax = watch('ageMax');

  const handleMatchRequest = async (data: MatchRequestData) => {
    setIsSubmitting(true);
    try {
      // Format: match#20-25#town
      const matchCommand = `match#${data.ageMin}-${data.ageMax}#${data.preferredTown}`;
      
      console.log('Sending match request:', matchCommand);

      const response = await api.post('/matching/request', {
        ageMin: data.ageMin,
        ageMax: data.ageMax,
        preferredTown: data.preferredTown,
        command: matchCommand
      });

      console.log('Match request result:', response.data);

      toast.success('Match request sent successfully!');
      onComplete();
    } catch (error: any) {
      console.error('Match request error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send match request';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <Search className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
            Find Your Match
          </h1>
          <p className="text-gray-600">
            Tell us your preferences and we'll find compatible matches for you
          </p>
        </div>

        {/* Match Request Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
          <form onSubmit={handleSubmit(handleMatchRequest)} className="space-y-6">
            {/* Age Range */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <Users className="w-5 h-5 text-primary-600" />
                <label className="text-sm font-semibold text-gray-700">
                  Preferred Age Range
                </label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Minimum Age
                  </label>
                  <input
                    {...register('ageMin', { 
                      required: 'Minimum age is required',
                      min: { value: 18, message: 'Minimum age must be 18' },
                      max: { value: 100, message: 'Invalid age' },
                      validate: (value) => {
                        if (ageMax && value >= ageMax) {
                          return 'Minimum age must be less than maximum age';
                        }
                        return true;
                      }
                    })}
                    type="number"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="18"
                  />
                  {errors.ageMin && (
                    <p className="mt-1 text-xs text-red-500">{errors.ageMin.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Maximum Age
                  </label>
                  <input
                    {...register('ageMax', { 
                      required: 'Maximum age is required',
                      min: { value: 18, message: 'Maximum age must be at least 18' },
                      max: { value: 100, message: 'Invalid age' },
                      validate: (value) => {
                        if (ageMin && value <= ageMin) {
                          return 'Maximum age must be greater than minimum age';
                        }
                        return true;
                      }
                    })}
                    type="number"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="35"
                  />
                  {errors.ageMax && (
                    <p className="mt-1 text-xs text-red-500">{errors.ageMax.message}</p>
                  )}
                </div>
              </div>

              {ageMin && ageMax && ageMin < ageMax && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                  <p className="text-sm text-primary-700 text-center">
                    Looking for matches aged {ageMin} - {ageMax} years
                  </p>
                </div>
              )}
            </div>

            {/* Preferred Location */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <MapPin className="w-5 h-5 text-primary-600" />
                <label className="text-sm font-semibold text-gray-700">
                  Preferred Location
                </label>
              </div>
              <input
                {...register('preferredTown', { 
                  required: 'Preferred location is required',
                  minLength: { value: 2, message: 'Location must be at least 2 characters' }
                })}
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="e.g., Nairobi, Mombasa, Kisumu"
              />
              {errors.preferredTown && (
                <p className="mt-1 text-xs text-red-500">{errors.preferredTown.message}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Enter the town or area where you'd like to find matches
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-4 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Finding Matches...</span>
                </>
              ) : (
                <>
                  <span>Find My Matches</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl border border-primary-200">
            <h4 className="font-semibold text-gray-800 mb-2">How it works:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• We'll search for compatible matches in your preferred area</li>
              <li>• Matches are based on age range and location preferences</li>
              <li>• You'll see profiles of people who match your criteria</li>
              <li>• Swipe right to like, left to pass</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchRequestForm;