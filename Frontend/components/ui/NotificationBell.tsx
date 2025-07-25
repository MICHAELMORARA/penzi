'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { useAppContext } from '@/lib/context/AppContext';

interface NotificationBellProps {
  className?: string;
  isActive?: boolean;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ 
  className = '', 
  isActive = false
}) => {
  const { state } = useAppContext();
  const unreadCount = state.unreadNotifications;

  return (
    <div className="relative">
      <Bell 
        className={`
          ${className}
          ${isActive ? 'text-white' : 'text-neutral-600 group-hover:text-neutral-700'}
          transition-colors duration-200
        `}
      />
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;