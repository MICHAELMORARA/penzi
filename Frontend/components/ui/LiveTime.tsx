'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface LiveTimeProps {
  className?: string;
  showIcon?: boolean;
  format?: 'full' | 'time' | 'date' | 'relative';
  updateInterval?: number; // in milliseconds
}

const LiveTime: React.FC<LiveTimeProps> = ({ 
  className = '', 
  showIcon = true, 
  format = 'full',
  updateInterval = 1000 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, updateInterval);

    return () => clearInterval(timer);
  }, [updateInterval]);

  const formatTime = (time: Date) => {
    switch (format) {
      case 'time':
        return time.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        });
      case 'date':
        return time.toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      case 'relative':
        return `Updated ${time.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
      case 'full':
      default:
        return time.toLocaleString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
    }
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {showIcon && <Clock className="h-3 w-3 text-gray-400" />}
      <span className="text-xs text-gray-500 font-mono">
        {formatTime(currentTime)}
      </span>
    </div>
  );
};

export default LiveTime;