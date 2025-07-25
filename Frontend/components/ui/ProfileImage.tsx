import React from 'react';
import { getFullImageUrl } from '@/lib/utils/imageUtils';

interface ProfileImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  onError?: () => void;
}

const ProfileImage: React.FC<ProfileImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  onError 
}) => {
  const fullImageUrl = getFullImageUrl(src);

  const handleError = () => {
    if (onError) {
      onError();
    }
  };

  return (
    <img
      src={fullImageUrl}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
};

export default ProfileImage;