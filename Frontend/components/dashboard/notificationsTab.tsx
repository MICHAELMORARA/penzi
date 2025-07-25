'use client';

import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, AlertCircle, Info, Clock, Eye, Heart, MessageSquare, X, Send, RefreshCw } from 'lucide-react';
import { useAppContext, actions } from '@/lib/context/AppContext';
import Loading from '@/components/ui/Loading';
import LiveTime from '@/components/ui/LiveTime';
import { useCurrentTime } from '@/lib/hooks/useCurrentTime';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  source: 'interest' | 'match' | 'message' | 'system';
  related_data?: any;
}

interface ResponseToast {
  isOpen: boolean;
  notificationId: string;
  phoneNumber: string;
  response: 'YES' | 'NO' | '';
}

interface SuccessToast {
  isOpen: boolean;
  message: string;
  type: 'success' | 'error';
}

const NotificationsTab: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { currentTime, formatRelativeTime } = useCurrentTime({ updateInterval: 1000 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseToast, setResponseToast] = useState<ResponseToast>({
    isOpen: false,
    notificationId: '',
    phoneNumber: '',
    response: ''
  });
  const [successToast, setSuccessToast] = useState<SuccessToast>({
    isOpen: false,
    message: '',
    type: 'success'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadNotifications();
    // Clear notifications when user visits the notifications tab
    dispatch(actions.clearNotifications());
  }, [dispatch]);

  // Update notification count when notifications change
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    dispatch(actions.setUnreadNotifications(unreadCount));
  }, [notifications, dispatch]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Load recent interests as notifications
      const interestsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/interests?per_page=20`);
      const interestsData = await interestsResponse.json();
      
      // Load recent matches as notifications
      const matchesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/matches?per_page=10`);
      const matchesData = await matchesResponse.json();
      
      // Load recent messages as notifications
      const messagesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/messages?per_page=10`);
      const messagesData = await messagesResponse.json();
      
      const allNotifications: Notification[] = [];
      
      // Convert interests to notifications
      if (interestsData.success && interestsData.data?.interests) {
        interestsData.data.interests.forEach((interest: any) => {
          if (interest.notification_sent) {
            allNotifications.push({
              id: `interest-${interest.id}`,
              type: interest.response === 'YES' ? 'success' : interest.response === 'NO' ? 'info' : 'warning',
              title: interest.response_received 
                ? `Interest ${interest.response === 'YES' ? 'Accepted' : 'Declined'}`
                : 'Interest Sent',
              message: interest.response_received
                ? `${interest.target_user?.name} ${interest.response === 'YES' ? 'accepted' : 'declined'} interest from ${interest.interested_user?.name}`
                : `Interest sent from ${interest.interested_user?.name} to ${interest.target_user?.name}. Waiting for response.`,
              timestamp: new Date(interest.created_at),
              read: false,
              source: 'interest',
              related_data: interest
            });
          }
        });
      }
      
      // Convert matches to notifications
      if (matchesData.success && matchesData.data?.matches) {
        matchesData.data.matches.forEach((match: any) => {
          allNotifications.push({
            id: `match-${match.id}`,
            type: 'success',
            title: 'New Match Created',
            message: `${match.requester?.name} and ${match.matched_user?.name} have been matched with ${match.compatibility_score}% compatibility`,
            timestamp: new Date(match.created_at),
            read: false,
            source: 'match',
            related_data: match
          });
        });
      }
      
      // Convert recent messages to notifications (only system messages)
      if (messagesData.success && messagesData.data?.messages) {
        messagesData.data.messages
          .filter((msg: any) => msg.direction === 'incoming' && msg.message_type !== 'admin_message')
          .slice(0, 5)
          .forEach((message: any) => {
            allNotifications.push({
              id: `message-${message.id}`,
              type: 'info',
              title: 'New SMS Received',
              message: `${message.user_name || 'Unknown User'} sent: "${message.message_body.substring(0, 50)}${message.message_body.length > 50 ? '...' : ''}"`,
              timestamp: new Date(message.timestamp),
              read: false,
              source: 'message',
              related_data: message
            });
          });
      }
      
      // Sort by timestamp (newest first)
      allNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setNotifications(allNotifications);
      
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getNotificationIcon = (type: string, source: string) => {
    if (source === 'interest') return <Eye className="h-5 w-5 text-blue-500" />;
    if (source === 'match') return <Heart className="h-5 w-5 text-pink-500" />;
    if (source === 'message') return <MessageSquare className="h-5 w-5 text-green-500" />;
    
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getNotificationBg = (type: string, read: boolean) => {
    const baseClasses = read ? 'bg-white' : 'bg-blue-50';
    return baseClasses;
  };

  const getSourceBadge = (source: string) => {
    const badges = {
      interest: { text: 'Interest', color: 'bg-blue-100 text-blue-800' },
      match: { text: 'Match', color: 'bg-pink-100 text-pink-800' },
      message: { text: 'SMS', color: 'bg-green-100 text-green-800' },
      system: { text: 'System', color: 'bg-gray-100 text-gray-800' }
    };
    
    const badge = badges[source as keyof typeof badges] || badges.system;
    
    return (
      <span className={`px-2 py-1 text-xs font-medium font-poppins rounded-full ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const openResponseToast = (notificationId: string, defaultPhone: string = '') => {
    setResponseToast({
      isOpen: true,
      notificationId,
      phoneNumber: defaultPhone,
      response: ''
    });
  };

  const closeResponseToast = () => {
    setResponseToast({
      isOpen: false,
      notificationId: '',
      phoneNumber: '',
      response: ''
    });
    setIsSubmitting(false);
  };

  const showSuccessToast = (message: string, type: 'success' | 'error' = 'success') => {
    setSuccessToast({
      isOpen: true,
      message,
      type
    });
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setSuccessToast(prev => ({ ...prev, isOpen: false }));
    }, 4000);
  };

  const closeSuccessToast = () => {
    setSuccessToast(prev => ({ ...prev, isOpen: false }));
  };

  const handleSubmitResponse = async () => {
    if (!responseToast.phoneNumber.trim()) {
      showSuccessToast('Please enter a phone number.', 'error');
      return;
    }
    
    if (!responseToast.response) {
      showSuccessToast('Please select YES or NO.', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sms/process-incoming`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_phone: responseToast.phoneNumber.trim(),
          to_phone: '22141', // System number
          message_body: responseToast.response,
          direction: 'incoming'
        })
      });
      
      if (res.ok) {
        showSuccessToast(`Response "${responseToast.response}" sent successfully!`, 'success');
        closeResponseToast();
        loadNotifications();
      } else {
        const err = await res.json();
        showSuccessToast(err.message || 'Failed to send response', 'error');
      }
    } catch (e) {
      showSuccessToast('Error sending response: ' + e, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-poppins text-gray-900">Notifications</h1>
          <p className="text-gray-600 font-poppins">Stay updated with platform activities</p>
        </div>
        <Loading text="Loading notifications..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-poppins text-gray-900">Notifications</h1>
          <p className="text-sm sm:text-base text-gray-600 font-poppins">Stay updated with platform activities</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <span className="text-xs sm:text-sm text-gray-600 font-poppins">
              {notifications.filter(n => !n.read).length} unread
            </span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={loadNotifications}
              disabled={loading}
              className="flex items-center space-x-1 text-xs sm:text-sm text-green-600 hover:text-green-800 font-poppins disabled:opacity-50 px-2 py-1 rounded"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={markAllAsRead}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-poppins px-2 py-1 rounded whitespace-nowrap"
            >
              <span className="hidden sm:inline">Mark all as read</span>
              <span className="sm:hidden">Mark read</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-poppins">No notifications yet</p>
            <p className="text-gray-400 text-sm mt-1 font-poppins">
              Notifications will appear here when users interact with the platform
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 sm:p-6 hover:bg-gray-50 transition-colors ${getNotificationBg(
                  notification.type,
                  notification.read
                )}`}
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-4 w-4 sm:h-5 sm:w-5">
                      {getNotificationIcon(notification.type, notification.source)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-1">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-1 sm:mb-0">
                        <h3 className="text-sm font-medium font-poppins text-gray-900 break-words">
                          {notification.title}
                        </h3>
                        <div className="flex-shrink-0">
                          {getSourceBadge(notification.source)}
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 self-start sm:self-center"></div>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 font-poppins break-words">
                      {notification.message}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 mb-2 font-poppins">
                      <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{formatRelativeTime(notification.timestamp)}</span>
                    </div>
                    {/* Respond to interest notification */}
                    {notification.source === 'interest' && !notification.related_data?.response_received && (
                      <button
                        className="mt-2 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs font-poppins flex items-center space-x-1 w-full sm:w-auto justify-center sm:justify-start"
                        onClick={() => {
                          const defaultPhone = notification.related_data?.target_user?.phone_number || '';
                          openResponseToast(notification.id, defaultPhone);
                        }}
                      >
                        <Send className="h-3 w-3" />
                        <span>Respond</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-medium font-poppins text-gray-900 mb-4">Notification Sources</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 border border-gray-200 rounded-lg">
            <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mb-2" />
            <p className="text-xs sm:text-sm font-medium font-poppins text-gray-900">Interest Notifications</p>
            <p className="text-xs text-gray-500 font-poppins mt-1">When users express interest in each other</p>
          </div>
          
          <div className="p-3 sm:p-4 border border-gray-200 rounded-lg">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500 mb-2" />
            <p className="text-xs sm:text-sm font-medium font-poppins text-gray-900">Match Notifications</p>
            <p className="text-xs text-gray-500 font-poppins mt-1">When successful matches are created</p>
          </div>
          
          <div className="p-3 sm:p-4 border border-gray-200 rounded-lg sm:col-span-2 lg:col-span-1">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mb-2" />
            <p className="text-xs sm:text-sm font-medium font-poppins text-gray-900">SMS Notifications</p>
            <p className="text-xs text-gray-500 font-poppins mt-1">Recent SMS interactions with users</p>
          </div>
        </div>
      </div>

      {/* Response Toast */}
      {responseToast.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold font-poppins text-gray-900">
                Respond to Interest
              </h3>
              <button
                onClick={closeResponseToast}
                className="text-gray-400 hover:text-gray-600"
                disabled={isSubmitting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Phone Number Input */}
              <div>
                <label className="block text-sm font-medium font-poppins text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={responseToast.phoneNumber}
                  onChange={(e) => setResponseToast(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="Enter phone number (e.g., +1234567890)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-poppins"
                  disabled={isSubmitting}
                />
              </div>

              {/* Response Selection */}
              <div>
                <label className="block text-sm font-medium font-poppins text-gray-700 mb-2">
                  Response
                </label>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setResponseToast(prev => ({ ...prev, response: 'YES' }))}
                    className={`flex-1 py-2 px-4 rounded-md font-poppins text-sm font-medium transition-colors ${
                      responseToast.response === 'YES'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    disabled={isSubmitting}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setResponseToast(prev => ({ ...prev, response: 'NO' }))}
                    className={`flex-1 py-2 px-4 rounded-md font-poppins text-sm font-medium transition-colors ${
                      responseToast.response === 'NO'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    disabled={isSubmitting}
                  >
                    NO
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={closeResponseToast}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 font-poppins text-sm font-medium hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitResponse}
                  disabled={isSubmitting || !responseToast.phoneNumber.trim() || !responseToast.response}
                  className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-md font-poppins text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send Response</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Toast */}
      {successToast.isOpen && (
        <div className="fixed top-4 left-4 right-4 sm:top-4 sm:right-4 sm:left-auto z-50 animate-in slide-in-from-right duration-300">
          <div className={`rounded-lg shadow-lg p-3 sm:p-4 max-w-sm w-full mx-auto sm:mx-0 ${
            successToast.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {successToast.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                )}
                <p className="font-poppins text-xs sm:text-sm font-medium break-words">
                  {successToast.message}
                </p>
              </div>
              <button
                onClick={closeSuccessToast}
                className="text-white hover:text-gray-200 ml-2 flex-shrink-0"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsTab;