'use client';

import { useState, useEffect } from 'react';

interface UseCurrentTimeOptions {
  updateInterval?: number; // in milliseconds
  timezone?: string;
}

export const useCurrentTime = (options: UseCurrentTimeOptions = {}) => {
  const { updateInterval = 1000, timezone } = options;
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, updateInterval);

    return () => clearInterval(timer);
  }, [updateInterval]);

  // Format functions
  const formatTime = (time: Date = currentTime) => {
    return time.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      timeZone: timezone
    });
  };

  const formatDate = (time: Date = currentTime) => {
    return time.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: timezone
    });
  };

  const formatDateTime = (time: Date = currentTime) => {
    return time.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: timezone
    });
  };

  const formatRelativeTime = (timestamp: string | Date) => {
    const messageTime = new Date(timestamp);
    const now = currentTime;
    const diffInSeconds = Math.floor((now.getTime() - messageTime.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // If message is from today
    if (diffInDays === 0) {
      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else {
        return messageTime.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: timezone
        });
      }
    }
    // If message is from yesterday
    else if (diffInDays === 1) {
      return `Yesterday ${messageTime.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: timezone
      })}`;
    }
    // If message is older
    else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }
    // For very old messages
    else {
      return messageTime.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone
      });
    }
  };

  const getTimestamp = () => {
    return currentTime.toISOString();
  };

  const isToday = (date: Date | string) => {
    const checkDate = new Date(date);
    const today = currentTime;
    return checkDate.toDateString() === today.toDateString();
  };

  const isYesterday = (date: Date | string) => {
    const checkDate = new Date(date);
    const yesterday = new Date(currentTime);
    yesterday.setDate(yesterday.getDate() - 1);
    return checkDate.toDateString() === yesterday.toDateString();
  };

  return {
    currentTime,
    formatTime,
    formatDate,
    formatDateTime,
    formatRelativeTime,
    getTimestamp,
    isToday,
    isYesterday
  };
};

export default useCurrentTime;