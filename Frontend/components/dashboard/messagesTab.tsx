'use client';

import React, { useEffect } from 'react';
import { MessageSquare, Filter, Phone, Clock } from 'lucide-react';
import { useAppContext, actions } from '@/lib/context/AppContext';
import { useDashboardApi } from '@/lib/hooks/useApi';
import Loading from '@/components/ui/Loading';
import Pagination from '@/components/ui/Pagination';

const MessagesTab: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { getMessages } = useDashboardApi();

  useEffect(() => {
    loadMessages();
  }, [state.messageFilters]);

  const loadMessages = async () => {
    try {
      await getMessages(state.messageFilters);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleDirectionFilter = (direction: 'all' | 'inbound' | 'outbound') => {
    dispatch(actions.setMessageFilters({ direction, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    dispatch(actions.setMessageFilters({ page }));
  };

  const getDirectionBadge = (direction: string) => {
    switch (direction) {
      case 'incoming':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Incoming</span>;
      case 'outgoing':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Outgoing</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{direction}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm sm:text-base text-gray-600">Monitor SMS communications</p>
        </div>
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          <span className="text-xs sm:text-sm text-gray-600">
            {state.messagesPagination?.total || 0} total messages
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <select
            value={state.messageFilters.direction}
            onChange={(e) => handleDirectionFilter(e.target.value as 'all' | 'inbound' | 'outbound')}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
          >
            <option value="all">All Messages</option>
            <option value="inbound">Incoming</option>
            <option value="outbound">Outgoing</option>
          </select>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-lg shadow">
        {state.messagesLoading ? (
          <div className="p-8">
            <Loading text="Loading messages..." />
          </div>
        ) : state.messages.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No messages found</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {state.messages.map((message) => (
                <div key={message.id} className="p-4 sm:p-6 hover:bg-gray-50">
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                          <p className="text-sm font-medium text-gray-900 break-words">
                            {message.direction === 'outgoing' && !message.user_name 
                              ? '22141' 
                              : message.user_name || 'Unknown User'}
                          </p>
                          <div className="flex-shrink-0">
                            {getDirectionBadge(message.direction)}
                          </div>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 flex-shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          <span className="whitespace-nowrap">
                            {new Date(message.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-700 break-words whitespace-pre-wrap">
                          {message.message_body}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-500 space-y-1 sm:space-y-0 sm:space-x-4">
                        <span className="break-all">From: {message.from_phone}</span>
                        <span className="break-all">To: {message.to_phone}</span>
                        <span className="break-words">Type: {message.message_type}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {state.messagesPagination && state.messagesPagination.pages > 1 && (
              <Pagination
                currentPage={state.messagesPagination.page}
                totalPages={state.messagesPagination.pages}
                totalItems={state.messagesPagination.total}
                itemsPerPage={state.messagesPagination.per_page}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MessagesTab;