'use client';

import React, { useEffect } from 'react';
import { Eye, Filter, Calendar, ArrowRight } from 'lucide-react';
import { useAppContext, actions } from '@/lib/context/AppContext';
import { useDashboardApi } from '@/lib/hooks/useApi';
import Loading from '@/components/ui/Loading';
import Pagination from '@/components/ui/Pagination';

const InterestsTab: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { getInterests } = useDashboardApi();

  useEffect(() => {
    loadInterests();
  }, [state.interestFilters]);

  const loadInterests = async () => {
    try {
      await getInterests(state.interestFilters);
    } catch (error) {
      console.error('Error loading interests:', error);
    }
  };

  const validResponses = ['all', 'pending', 'YES', 'NO'] as const;
  type ResponseType = typeof validResponses[number];
  const handleResponseFilter = (response: string) => {
    if (validResponses.includes(response as ResponseType)) {
      dispatch(actions.setInterestFilters({ response: response as ResponseType, page: 1 }));
    }
  };

  const handlePageChange = (page: number) => {
    dispatch(actions.setInterestFilters({ page }));
  };

  const getResponseBadge = (response: string | null) => {
    switch (response) {
      case 'YES':
        return <span className="px-2 py-1 text-xs font-medium font-poppins bg-green-100 text-green-800 rounded-full">Accepted</span>;
      case 'NO':
        return <span className="px-2 py-1 text-xs font-medium font-poppins bg-red-100 text-red-800 rounded-full">Declined</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium font-poppins bg-yellow-100 text-yellow-800 rounded-full">Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-poppins text-black">Interests</h1>
          <p className="text-black font-poppins">Monitor user interest expressions and responses</p>
        </div>
        <div className="flex items-center space-x-2">
          <Eye className="h-5 w-5 text-red-500" />
          <span className="text-sm text-black font-poppins">
            {state.interestsPagination?.total || 0} total interests
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={state.interestFilters.response}
            onChange={(e) => handleResponseFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent font-poppins"
          >
            <option value="all">All Interests</option>
            <option value="pending">Pending</option>
            <option value="YES">Accepted</option>
            <option value="NO">Declined</option>
          </select>
        </div>
      </div>

      {/* Interests List */}
      <div className="bg-white rounded-lg shadow">
        {state.interestsLoading ? (
          <div className="p-8">
            <Loading text="Loading interests..." />
          </div>
        ) : state.interests.length === 0 ? (
          <div className="p-8 text-center">
            <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-poppins">No interests found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium font-poppins text-gray-500 uppercase tracking-wider">
                      Interest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium font-poppins text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium font-poppins text-gray-500 uppercase tracking-wider">
                      Response
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium font-poppins text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium font-poppins text-gray-500 uppercase tracking-wider">
                      Response Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {state.interests.map((interest) => (
                    <tr key={interest.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm">
                            <div className="font-medium font-poppins text-gray-900">
                              {interest.interested_user?.name || 'Unknown'}
                            </div>
                            <div className="text-gray-500 text-xs font-poppins">
                              {interest.interested_user?.phone}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                          <div className="text-sm">
                            <div className="font-medium font-poppins text-gray-900">
                              {interest.target_user?.name || 'Unknown'}
                            </div>
                            <div className="text-gray-500 text-xs font-poppins">
                              {interest.target_user?.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium font-poppins bg-red-100 text-red-800 rounded-full">
                          {interest.interest_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getResponseBadge(interest.response)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-poppins">{new Date(interest.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {interest.response_at ? (
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="font-poppins">{new Date(interest.response_at).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-poppins">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden">
              {state.interests.map((interest) => (
                <div key={interest.id} className="p-4 border-b border-gray-200 last:border-b-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Eye className="h-5 w-5 text-red-500" />
                        <span className="text-sm font-medium font-poppins text-black">Interest #{interest.id}</span>
                      </div>
                      {getResponseBadge(interest.response)}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="flex-1">
                        <p className="font-medium font-poppins text-black">
                          {interest.interested_user?.name || 'Unknown'}
                        </p>
                        <p className="text-black text-xs font-poppins">
                          {interest.interested_user?.phone}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="font-medium font-poppins text-black">
                          {interest.target_user?.name || 'Unknown'}
                        </p>
                        <p className="text-black text-xs font-poppins">
                          {interest.target_user?.phone}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full font-poppins">
                        {interest.interest_type}
                      </span>
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span className="font-poppins">{new Date(interest.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {state.interestsPagination && state.interestsPagination.pages > 1 && (
              <Pagination
                currentPage={state.interestsPagination.page}
                totalPages={state.interestsPagination.pages}
                totalItems={state.interestsPagination.total}
                itemsPerPage={state.interestsPagination.per_page}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InterestsTab;