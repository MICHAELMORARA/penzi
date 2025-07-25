'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { User, MapPin, Briefcase, Heart, GraduationCap, Users, Church, Globe } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

interface RegistrationData {
  gender: string;
  county: string;
  town: string;
  levelOfEducation: string;
  profession: string;
  maritalStatus: string;
  religion: string;
  ethnicity: string;
  selfDescription: string;
}

interface RegistrationCompletionProps {
  onComplete: () => void;
}

const RegistrationCompletion: React.FC<RegistrationCompletionProps> = ({ onComplete }) => {
  const { state } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<any>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue
  } = useForm<RegistrationData>();

  useEffect(() => {
    fetchRegistrationStatus();
  }, []);

  const fetchRegistrationStatus = async () => {
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
        
        if (status.canAccessMatches) {
          onComplete();
        }
      }
    } catch (error) {
      console.error('Failed to fetch registration status:', error);
    }
  };

  const onSubmit = async (data: RegistrationData) => {
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/matching/complete-profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.canAccessMatches) {
          onComplete();
        } else {
          // Move to next step or show completion message
          setCurrentStep(currentStep + 1);
        }
      } else {
        const error = await response.json();
        console.error('Profile completion failed:', error.message);
      }
    } catch (error) {
      console.error('Profile completion error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Heart className="h-12 w-12 text-primary-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h2>
        <p className="text-gray-600">Help us find your perfect match by completing your profile</p>
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Users className="inline h-4 w-4 mr-2" />
          Gender
        </label>
        <select
          {...register('gender', { required: 'Gender is required' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Select Gender</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
        {errors.gender && (
          <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
        )}
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="inline h-4 w-4 mr-2" />
            County
          </label>
          <input
            {...register('county', { required: 'County is required' })}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., Nairobi"
          />
          {errors.county && (
            <p className="mt-1 text-sm text-red-600">{errors.county.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Town/Area
          </label>
          <input
            {...register('town', { required: 'Town is required' })}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., Westlands"
          />
          {errors.town && (
            <p className="mt-1 text-sm text-red-600">{errors.town.message}</p>
          )}
        </div>
      </div>

      {/* Education & Profession */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <GraduationCap className="inline h-4 w-4 mr-2" />
            Education Level
          </label>
          <select
            {...register('levelOfEducation', { required: 'Education level is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Select Education</option>
            <option value="Primary">Primary</option>
            <option value="Secondary">Secondary</option>
            <option value="Certificate">Certificate</option>
            <option value="Diploma">Diploma</option>
            <option value="Degree">Degree</option>
            <option value="Masters">Masters</option>
            <option value="PhD">PhD</option>
          </select>
          {errors.levelOfEducation && (
            <p className="mt-1 text-sm text-red-600">{errors.levelOfEducation.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Briefcase className="inline h-4 w-4 mr-2" />
            Profession
          </label>
          <input
            {...register('profession', { required: 'Profession is required' })}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., Software Engineer"
          />
          {errors.profession && (
            <p className="mt-1 text-sm text-red-600">{errors.profession.message}</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setCurrentStep(2)}
        className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors"
      >
        Continue
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <User className="h-12 w-12 text-primary-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Details</h2>
        <p className="text-gray-600">Tell us more about yourself</p>
      </div>

      {/* Marital Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Heart className="inline h-4 w-4 mr-2" />
          Marital Status
        </label>
        <select
          {...register('maritalStatus', { required: 'Marital status is required' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Select Status</option>
          <option value="Single">Single</option>
          <option value="Divorced">Divorced</option>
          <option value="Widowed">Widowed</option>
          <option value="Separated">Separated</option>
        </select>
        {errors.maritalStatus && (
          <p className="mt-1 text-sm text-red-600">{errors.maritalStatus.message}</p>
        )}
      </div>

      {/* Religion & Ethnicity */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Church className="inline h-4 w-4 mr-2" />
            Religion
          </label>
          <input
            {...register('religion', { required: 'Religion is required' })}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., Christian"
          />
          {errors.religion && (
            <p className="mt-1 text-sm text-red-600">{errors.religion.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Globe className="inline h-4 w-4 mr-2" />
            Ethnicity
          </label>
          <input
            {...register('ethnicity', { required: 'Ethnicity is required' })}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., Kenyan"
          />
          {errors.ethnicity && (
            <p className="mt-1 text-sm text-red-600">{errors.ethnicity.message}</p>
          )}
        </div>
      </div>

      {/* Self Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          About Yourself
        </label>
        <textarea
          {...register('selfDescription', { 
            required: 'Description is required',
            minLength: { value: 20, message: 'Description must be at least 20 characters' }
          })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Tell us about yourself, your interests, what you're looking for..."
        />
        {errors.selfDescription && (
          <p className="mt-1 text-sm text-red-600">{errors.selfDescription.message}</p>
        )}
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={() => setCurrentStep(1)}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-primary-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Completing...' : 'Complete Profile'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">Step {currentStep} of 2</span>
            <span className="text-sm font-medium text-gray-600">{currentStep === 1 ? '50%' : '100%'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${currentStep * 50}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {currentStep === 1 ? renderStep1() : renderStep2()}
        </form>
      </div>
    </div>
  );
};

export default RegistrationCompletion;