'use client';

import React from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import toast from 'react-hot-toast';

const ThirdPartyAuth: React.FC = () => {
  const { state } = useAuth();

  const handleGoogleAuth = async () => {
    try {
      // In a real implementation, you would use Google OAuth SDK
      // For now, we'll show a placeholder
      toast.success('Google authentication will be implemented with Google OAuth SDK');
      
      // Example implementation:
      // const response = await window.gapi.auth2.getAuthInstance().signIn();
      // const token = response.getAuthResponse().id_token;
      // await authApi.googleAuth(token);
    } catch (error) {
      toast.error('Google authentication failed');
    }
  };

  const handleFacebookAuth = async () => {
    try {
      // In a real implementation, you would use Facebook SDK
      toast.success('Facebook authentication will be implemented with Facebook SDK');
      
      // Example implementation:
      // const response = await window.FB.login();
      // const token = response.authResponse.accessToken;
      // await authApi.facebookAuth(token);
    } catch (error) {
      toast.error('Facebook authentication failed');
    }
  };

  const handleAppleAuth = async () => {
    try {
      // In a real implementation, you would use Apple Sign-In
      toast.success('Apple authentication will be implemented with Apple Sign-In');
    } catch (error) {
      toast.error('Apple authentication failed');
    }
  };

  return (
    <div className="mt-8">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {/* Google */}
        <button
          onClick={handleGoogleAuth}
          disabled={state.isLoading}
          className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        </button>

        {/* Facebook */}
        <button
          onClick={handleFacebookAuth}
          disabled={state.isLoading}
          className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </button>

        {/* Apple */}
        <button
          onClick={handleAppleAuth}
          disabled={state.isLoading}
          className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.017 0C8.396 0 8.025.044 6.79.207 5.557.37 4.697.723 3.953 1.171c-.744.448-1.375 1.046-1.823 1.79C1.682 3.705 1.329 4.565 1.166 5.798.003 7.033-.041 7.404-.041 11.025s.044 3.992.207 5.227c.163 1.233.516 2.093.964 2.837.448.744 1.046 1.375 1.79 1.823.744.448 1.604.801 2.837.964 1.235.163 1.606.207 5.227.207s3.992-.044 5.227-.207c1.233-.163 2.093-.516 2.837-.964.744-.448 1.375-1.046 1.823-1.79.448-.744.801-1.604.964-2.837.163-1.235.207-1.606.207-5.227s-.044-3.992-.207-5.227c-.163-1.233-.516-2.093-.964-2.837-.448-.744-1.046-1.375-1.79-1.823C19.295 1.682 18.435 1.329 17.202 1.166 15.967.003 15.596-.041 11.975-.041z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ThirdPartyAuth;