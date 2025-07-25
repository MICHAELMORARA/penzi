'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, X, Star, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface Photo {
  id: number;
  userId: number;
  photoUrl: string;
  isPrimary: boolean;
  isVerified: boolean;
  uploadOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface PhotoManagerProps {
  onClose?: () => void;
}

const PhotoManager: React.FC<PhotoManagerProps> = ({ onClose }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      setIsLoading(true);
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const response = await fetch('/api/registration/photos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }

      const data = await response.json();
      setPhotos(data.photos || []);
      setProfilePicture(data.profilePicture);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast.error('Failed to load photos');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // Validate files
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      toast.error('Some files were skipped. Please upload images under 5MB.');
    }

    if (photos.length + validFiles.length > 6) {
      toast.error(`You can only have up to 6 photos. You currently have ${photos.length} photos.`);
      return;
    }

    setIsUploading(true);

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('photos', file);
      });

      const response = await fetch('/api/registration/upload-photos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload photos');
      }

      const data = await response.json();
      toast.success(data.message);
      
      // Refresh photos
      await fetchPhotos();
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      toast.error(error.message || 'Failed to upload photos');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const response = await fetch(`/api/registration/photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete photo');
      }

      const data = await response.json();
      toast.success(data.message);
      
      // Refresh photos
      await fetchPhotos();
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      toast.error(error.message || 'Failed to delete photo');
    }
  };

  const handleSetPrimary = async (photoId: number) => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const response = await fetch(`/api/registration/photos/${photoId}/primary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set primary photo');
      }

      const data = await response.json();
      toast.success(data.message);
      
      // Refresh photos
      await fetchPhotos();
    } catch (error: any) {
      console.error('Error setting primary photo:', error);
      toast.error(error.message || 'Failed to set primary photo');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Your Photos</h1>
            <p className="text-gray-600">Upload and organize your profile photos</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white shadow-lg hover:shadow-xl transition-all"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          )}
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              style={{ display: 'none' }}
              disabled={isUploading || photos.length >= 6}
            />
            <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {photos.length >= 6 ? 'Maximum Photos Reached' : 'Add More Photos'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {photos.length >= 6 
                ? 'You have reached the maximum of 6 photos. Delete some to add new ones.'
                : `Upload up to ${6 - photos.length} more photos. Max 5MB each.`
              }
            </p>
            {photos.length < 6 && (
              <button
                type="button"
                onClick={() => {
                  console.log('Choose Photos button clicked');
                  if (fileInputRef.current) {
                    console.log('File input found, triggering click');
                    fileInputRef.current.click();
                  } else {
                    console.log('File input ref is null');
                  }
                }}
                disabled={isUploading}
                className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center space-x-2 mx-auto disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Choose Photos</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Photos Grid */}
        {photos.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Your Photos ({photos.length}/6)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={photo.photoUrl}
                      alt="Profile photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Photo Badges */}
                  <div className="absolute top-2 left-2 flex space-x-1">
                    {photo.isPrimary && (
                      <div className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                        <Star className="w-3 h-3" />
                        <span>Main</span>
                      </div>
                    )}
                    {photo.isVerified && (
                      <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        Verified
                      </div>
                    )}
                  </div>

                  {/* Photo Actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-1">
                      {!photo.isPrimary && (
                        <button
                          onClick={() => handleSetPrimary(photo.id)}
                          className="bg-yellow-500 text-white p-1 rounded-full hover:bg-yellow-600 transition-colors"
                          title="Set as main photo"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                        title="Delete photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Photo Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs">
                      Uploaded: {new Date(photo.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Photo Tips */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Photo Tips:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your main photo (marked with ⭐) appears first in your profile</li>
                <li>• Use clear, well-lit photos that show your face</li>
                <li>• Include a mix of close-up and full-body shots</li>
                <li>• Show your personality and interests</li>
                <li>• Avoid group photos as your main picture</li>
                <li>• Photos may need verification before appearing to other users</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <Camera className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Photos Yet</h2>
            <p className="text-gray-600 mb-6">
              Upload your first photo to get started. Profiles with photos get 10x more matches!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoManager;