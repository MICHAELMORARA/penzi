'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { User, Camera, Edit, Save, X, Upload } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { state: authState, updateUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    age: '',
    location: '',
  });

  useEffect(() => {
    // Redirect if not authenticated
    if (!authState.isAuthenticated && !authState.isLoading) {
      router.push('/login');
      return;
    }

    // Populate form with user data
    if (authState.user) {
      setFormData({
        firstName: authState.user.firstName || '',
        lastName: authState.user.lastName || '',
        bio: authState.user.bio || '',
        age: authState.user.age?.toString() || '',
        location: authState.user.location || '',
      });
    }
  }, [authState.isAuthenticated, authState.isLoading, authState.user, router]);

  // Show loading while checking authentication
  if (authState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!authState.isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    // Here you would typically make an API call to update the user profile
    updateUser({
      firstName: formData.firstName,
      lastName: formData.lastName,
      bio: formData.bio,
      age: parseInt(formData.age) || undefined,
      location: formData.location,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (authState.user) {
      setFormData({
        firstName: authState.user.firstName || '',
        lastName: authState.user.lastName || '',
        bio: authState.user.bio || '',
        age: authState.user.age?.toString() || '',
        location: authState.user.location || '',
      });
    }
    setIsEditing(false);
  };

  // Helper function to get full image URL
  const getImageUrl = (profilePicture: string | undefined) => {
    if (!profilePicture) return '';
    if (profilePicture.startsWith('http')) return profilePicture;
    return `http://localhost:5000${profilePicture}`;
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  // Handle camera icon click
  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    
    try {
      // Upload the image
      const response = await authApi.uploadProfilePicture(file);
      
      // Update user profile with new image URL
      updateUser({
        profilePicture: response.profilePicture
      });
      
      toast.success('Profile picture updated successfully!');
      setImageError(false);
    } catch (error: any) {
      console.error('Failed to upload profile picture:', error);
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <User className="h-8 w-8 mr-3 text-primary-600" />
            My Profile
          </h1>
          <p className="text-gray-600 mt-2">Manage your profile information and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Picture Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                    {authState.user?.profilePicture && !imageError ? (
                      <img
                        src={getImageUrl(authState.user.profilePicture)}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                        onLoad={handleImageLoad}
                      />
                    ) : (
                      <User className="h-16 w-16 text-gray-400" />
                    )}
                    
                    {/* Upload overlay when uploading */}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Camera button */}
                  <button 
                    onClick={handleCameraClick}
                    disabled={isUploading}
                    className="absolute bottom-4 right-0 bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Change profile picture"
                  >
                    {isUploading ? (
                      <Upload className="h-4 w-4 animate-pulse" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                
                <h3 className="text-lg font-medium text-gray-900">
                  {authState.user?.firstName} {authState.user?.lastName}
                </h3>
                <p className="text-gray-600">@{authState.user?.username}</p>
                
                {/* Upload instructions */}
                <p className="text-xs text-gray-500 mt-2">
                  Click the camera icon to change your profile picture
                </p>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center space-x-2 text-primary-600 hover:text-primary-700"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSave}
                        className="flex items-center space-x-2 bg-primary-600 text-white px-3 py-1 rounded-md hover:bg-primary-700"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-700"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">{authState.user?.firstName || 'Not set'}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">{authState.user?.lastName || 'Not set'}</p>
                  )}
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">{authState.user?.age || 'Not set'}</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">{authState.user?.location || 'Not set'}</p>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  {isEditing ? (
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="text-gray-900">{authState.user?.bio || 'No bio added yet'}</p>
                  )}
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <p className="text-gray-900">{authState.user?.email}</p>
                  <p className="text-sm text-gray-500">Email cannot be changed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}