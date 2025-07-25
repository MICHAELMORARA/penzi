'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, Upload, X, Check, ArrowRight, ArrowLeft, Heart, MapPin, GraduationCap, Briefcase, Users, Church, Globe, User, FileText, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import toast from 'react-hot-toast';

interface RegistrationData {
  // Step 1: Basic Info
  firstName?: string;
  lastName?: string;
  age?: number;
  gender?: string;
  
  // Step 2: Location
  county?: string;
  town?: string;
  
  // Step 3: Education
  levelOfEducation?: string;
  
  // Step 4: Profession
  profession?: string;
  
  // Step 5: Personal Details
  maritalStatus?: string;
  religion?: string;
  
  // Step 6: Ethnicity
  ethnicity?: string;
  
  // Step 7: Description
  selfDescription?: string;
  
  // Step 8: Photos
  photos?: File[];
}

interface RegistrationFlowProps {
  onComplete: () => void;
}

const RegistrationFlow: React.FC<RegistrationFlowProps> = ({ onComplete }) => {
  const { state } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({});
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue
  } = useForm();

  const totalSteps = 8;

  const stepConfig = [
    {
      title: 'Basic Information',
      description: 'Tell us about yourself',
      icon: User,
      fields: ['firstName', 'lastName', 'age', 'gender']
    },
    {
      title: 'Location',
      description: 'Where are you located?',
      icon: MapPin,
      fields: ['county', 'town']
    },
    {
      title: 'Education',
      description: 'Your educational background',
      icon: GraduationCap,
      fields: ['levelOfEducation']
    },
    {
      title: 'Profession',
      description: 'What do you do for work?',
      icon: Briefcase,
      fields: ['profession']
    },
    {
      title: 'Personal Details',
      description: 'Tell us more about yourself',
      icon: Users,
      fields: ['maritalStatus', 'religion']
    },
    {
      title: 'Cultural Background',
      description: 'Your ethnicity',
      icon: Globe,
      fields: ['ethnicity']
    },
    {
      title: 'About You',
      description: 'Describe yourself',
      icon: FileText,
      fields: ['selfDescription']
    },
    {
      title: 'Profile Photos',
      description: 'Add photos to your profile',
      icon: ImageIcon,
      fields: ['photos']
    }
  ];

  const handleNext = async (data: any) => {
    try {
      // Update local registration data first
      setRegistrationData(prev => ({ ...prev, ...data }));

      if (currentStep < totalSteps) {
        // For now, just move to next step without backend call
        // We'll submit all data at the end
        setCurrentStep(currentStep + 1);
        reset(); // Clear form for next step
      } else {
        // Final step - submit all data to backend
        await handleFinalSubmission({ ...registrationData, ...data });
      }
    } catch (error: any) {
      console.error('Registration step error:', error);
      toast.error(error.message || 'Failed to save step data');
    }
  };

  const handlePhotoUpload = async () => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];

    const formData = new FormData();
    uploadedPhotos.forEach((photo, index) => {
      formData.append('photos', photo);
    });

    const photoResponse = await fetch('/api/registration/upload-photos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!photoResponse.ok) {
      console.warn('Photo upload failed, but registration was successful');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinalSubmission = async (finalData: RegistrationData) => {
    setIsSubmitting(true);
    try {
      // Submit registration data to backend
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      console.log('Final submission data:', finalData);
      console.log('Token:', token ? 'Present' : 'Missing');

      // Try the proxied URL first, then fallback to direct backend URL
      const apiUrls = [
        '/api/registration/complete',
        'http://localhost:5000/api/registration/complete'
      ];

      let response;
      let lastError;

      for (const url of apiUrls) {
        try {
          console.log(`Trying URL: ${url}`);
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(finalData)
          });

          console.log(`Response from ${url}:`, response.status, response.ok);

          if (response.ok) {
            break; // Success, exit the loop
          } else {
            const errorText = await response.text();
            console.error(`Error from ${url}:`, errorText);
            lastError = new Error(`HTTP ${response.status}: ${errorText}`);
          }
        } catch (fetchError) {
          console.error(`Fetch error for ${url}:`, fetchError);
          lastError = fetchError;
          continue; // Try next URL
        }
      }

      if (!response || !response.ok) {
        throw lastError || new Error('All API endpoints failed');
      }

      const responseData = await response.json();
      console.log('Registration success response:', responseData);

      // Upload photos if any
      if (uploadedPhotos.length > 0) {
        const formData = new FormData();
        uploadedPhotos.forEach((photo, index) => {
          formData.append('photos', photo);
        });

        // Try photo upload with same fallback approach
        for (const baseUrl of ['/api', 'http://localhost:5000/api']) {
          try {
            const photoResponse = await fetch(`${baseUrl}/registration/upload-photos`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: formData
            });

            if (photoResponse.ok) {
              console.log('Photo upload successful');
              break;
            }
          } catch (photoError) {
            console.warn('Photo upload failed:', photoError);
          }
        }
      }
      
      toast.success('Registration completed successfully!');
      onComplete();
    } catch (error: any) {
      console.error('Final submission error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      toast.error('Some files were skipped. Please upload images under 5MB.');
    }

    setUploadedPhotos(prev => [...prev, ...validFiles].slice(0, 6)); // Max 6 photos
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const renderStepContent = () => {
    const step = stepConfig[currentStep - 1];
    const StepIcon = step.icon;

    switch (currentStep) {
      case 1: // Basic Information
        return (
          <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <StepIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h2>
              <p className="text-gray-600">{step.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  {...register('firstName', { required: 'First name is required' })}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Enter your first name"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  {...register('lastName', { required: 'Last name is required' })}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Enter your last name"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName.message as string}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age
              </label>
              <input
                {...register('age', { 
                  required: 'Age is required',
                  min: { value: 18, message: 'You must be at least 18 years old' },
                  max: { value: 100, message: 'Please enter a valid age' }
                })}
                type="number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Enter your age"
              />
              {errors.age && (
                <p className="mt-1 text-sm text-red-600">{errors.age.message as string}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                {...register('gender', { required: 'Gender is required' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">Select your gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-sm text-red-600">{errors.gender.message as string}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <span>Continue</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        );

      case 2: // Location
        return (
          <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <StepIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h2>
              <p className="text-gray-600">{step.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                County
              </label>
              <input
                {...register('county', { required: 'County is required' })}
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="e.g., Nairobi, Mombasa, Kisumu"
              />
              {errors.county && (
                <p className="mt-1 text-sm text-red-600">{errors.county.message as string}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Town/Area
              </label>
              <input
                {...register('town', { required: 'Town is required' })}
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="e.g., Westlands, Kilifi, Kisumu Central"
              />
              {errors.town && (
                <p className="mt-1 text-sm text-red-600">{errors.town.message as string}</p>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handlePrevious}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        );

      case 3: // Education
        return (
          <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <StepIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h2>
              <p className="text-gray-600">{step.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level of Education
              </label>
              <select
                {...register('levelOfEducation', { required: 'Education level is required' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">Select your education level</option>
                <option value="Primary">Primary School</option>
                <option value="Secondary">Secondary School</option>
                <option value="Certificate">Certificate</option>
                <option value="Diploma">Diploma</option>
                <option value="Degree">Bachelor's Degree</option>
                <option value="Masters">Master's Degree</option>
                <option value="PhD">PhD</option>
                <option value="Other">Other</option>
              </select>
              {errors.levelOfEducation && (
                <p className="mt-1 text-sm text-red-600">{errors.levelOfEducation.message as string}</p>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handlePrevious}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        );

      case 4: // Profession
        return (
          <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <StepIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h2>
              <p className="text-gray-600">{step.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profession
              </label>
              <input
                {...register('profession', { required: 'Profession is required' })}
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="e.g., Software Engineer, Teacher, Doctor, Student"
              />
              {errors.profession && (
                <p className="mt-1 text-sm text-red-600">{errors.profession.message as string}</p>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handlePrevious}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        );

      case 5: // Personal Details
        return (
          <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <StepIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h2>
              <p className="text-gray-600">{step.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marital Status
              </label>
              <select
                {...register('maritalStatus', { required: 'Marital status is required' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">Select your marital status</option>
                <option value="Single">Single</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </select>
              {errors.maritalStatus && (
                <p className="mt-1 text-sm text-red-600">{errors.maritalStatus.message as string}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Religion
              </label>
              <input
                {...register('religion', { required: 'Religion is required' })}
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="e.g., Christian, Muslim, Hindu, Other"
              />
              {errors.religion && (
                <p className="mt-1 text-sm text-red-600">{errors.religion.message as string}</p>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handlePrevious}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        );

      case 6: // Ethnicity
        return (
          <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <StepIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h2>
              <p className="text-gray-600">{step.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ethnicity
              </label>
              <input
                {...register('ethnicity', { required: 'Ethnicity is required' })}
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="e.g., Kikuyu, Luo, Luhya, Kalenjin, Kamba"
              />
              {errors.ethnicity && (
                <p className="mt-1 text-sm text-red-600">{errors.ethnicity.message as string}</p>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handlePrevious}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        );

      case 7: // Description
        return (
          <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <StepIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h2>
              <p className="text-gray-600">{step.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tell us about yourself
              </label>
              <textarea
                {...register('selfDescription', { 
                  required: 'Description is required',
                  minLength: { value: 10, message: 'Description must be at least 10 characters' }
                })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                placeholder="Write a brief description about yourself, your interests, and what you're looking for..."
              />
              {errors.selfDescription && (
                <p className="mt-1 text-sm text-red-600">{errors.selfDescription.message as string}</p>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handlePrevious}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        );

      case 8: // Photos
        return (
          <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <StepIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h2>
              <p className="text-gray-600">{step.description}</p>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-pink-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">Add Photos</p>
                <p className="text-sm text-gray-500 mb-4">
                  Upload up to 6 photos. First photo will be your main profile picture.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center space-x-2 mx-auto"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose Photos</span>
                </button>
              </div>

              {uploadedPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {uploadedPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      {index === 0 && (
                        <div className="absolute top-2 left-2 bg-pink-500 text-white text-xs px-2 py-1 rounded">
                          Main
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Photo Tips:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Use clear, well-lit photos</li>
                  <li>• Smile and look confident</li>
                  <li>• Include both close-up and full-body shots</li>
                  <li>• Show your personality and interests</li>
                  <li>• Avoid group photos as your main picture</li>
                </ul>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handlePrevious}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Completing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Complete Registration</span>
                  </>
                )}
              </button>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Let's build your perfect dating profile step by step</p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6 relative">
            {stepConfig.map((step, index) => {
              const StepIcon = step.icon;
              const stepNumber = index + 1;
              const isActive = stepNumber === currentStep;
              const isCompleted = stepNumber < currentStep;

              return (
                <div key={index} className="flex flex-col items-center flex-1 relative">
                  {/* Connector Line */}
                  {index < stepConfig.length - 1 && (
                    <div className={`
                      absolute top-6 left-1/2 w-full h-0.5 -z-10 transition-all duration-300
                      ${isCompleted ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-gray-200'}
                    `} style={{ transform: 'translateX(50%)', width: 'calc(100% - 24px)' }} />
                  )}

                  {/* Step Circle */}
                  <div className={`
                    relative w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 z-10 bg-white
                    ${isCompleted 
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' 
                      : isActive 
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white ring-4 ring-pink-200 shadow-lg' 
                        : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                    }
                  `}>
                    {isCompleted ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>

                  {/* Step Title */}
                  <div className="text-center max-w-20">
                    <p className={`text-xs font-medium ${
                      isActive ? 'text-pink-600' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      Step {stepNumber}
                    </p>
                    <p className={`text-xs leading-tight ${
                      isActive ? 'text-pink-600' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
          
          {/* Progress Text */}
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span className="font-medium">{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
            <span>{currentStep} of {totalSteps} steps</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {renderStepContent()}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need help? Each step helps us find your perfect match. Take your time and be honest!
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationFlow;