'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  UserCheck, 
  UserX, 
  Edit, 
  Trash2,
  Phone,
  MapPin,
  Calendar,
  User
} from 'lucide-react';
import { useAppContext, actions } from '@/lib/context/AppContext';
import { useUserApi } from '@/lib/hooks/useApi';
import { UserSearchParams } from '@/lib/api/userApi';
import { useNotification } from '@/components/ui/Notification';
import Loading from '@/components/ui/Loading';
import Pagination from '@/components/ui/Pagination';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type UserStatus = UserSearchParams['status'];

const UsersTab: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { getUsers, activateUser, deactivateUser, deleteUser } = useUserApi();
  const { addNotification } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    user: any | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    user: null,
    isLoading: false
  });

  useEffect(() => {
    loadUsers();
  }, [state.userFilters]);

  const loadUsers = async () => {
    try {
      const apiParams: UserSearchParams = {
        page: state.userFilters.page,
        search: state.userFilters.search || undefined,
        status: state.userFilters.status as UserStatus
      };
      await getUsers(apiParams);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchParams = {
      page: 1,
      search: searchTerm || '',
      status: state.userFilters.status
    };
    dispatch(actions.setUserFilters(searchParams));
  };

  const handleStatusFilter = (status: UserStatus) => {
    const searchParams = {
      page: 1,
      status: status || 'all',
      search: state.userFilters.search
    };
    dispatch(actions.setUserFilters(searchParams));
  };

  const handlePageChange = (page: number) => {
    const searchParams = {
      page,
      search: state.userFilters.search,
      status: state.userFilters.status
    };
    dispatch(actions.setUserFilters(searchParams));
  };

  const handleActivateUser = async (userId: number) => {
    try {
      await activateUser(userId);
      const user = state.users.find(u => u.id === userId);
      addNotification({
        type: 'success',
        title: 'User Activated',
        message: `${user?.name || 'User'} has been successfully activated`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Activation Failed',
        message: 'Failed to activate user. Please try again.'
      });
    }
  };

  const handleDeactivateUser = async (userId: number) => {
    try {
      await deactivateUser(userId);
      const user = state.users.find(u => u.id === userId);
      addNotification({
        type: 'warning',
        title: 'User Deactivated',
        message: `${user?.name || 'User'} has been deactivated`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Deactivation Failed',
        message: 'Failed to deactivate user. Please try again.'
      });
    }
  };

  const handleDeleteUser = (user: any) => {
    console.log('Delete user clicked:', user);
    setDeleteDialog({
      isOpen: true,
      user,
      isLoading: false
    });
    console.log('Delete dialog state set to:', { isOpen: true, user, isLoading: false });
  };

  const confirmDeleteUser = async () => {
    if (!deleteDialog.user) return;

    setDeleteDialog(prev => ({ ...prev, isLoading: true }));

    try {
      await deleteUser(deleteDialog.user.id);
      addNotification({
        type: 'success',
        title: 'User Deleted',
        message: `${deleteDialog.user.name || 'User'} has been permanently removed from the system`
      });
      setDeleteDialog({ isOpen: false, user: null, isLoading: false });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Deletion Failed',
        message: 'Failed to delete user. This may be due to existing data dependencies. Please contact support if the problem persists.'
      });
      setDeleteDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const cancelDeleteUser = () => {
    console.log('Cancel delete user clicked');
    setDeleteDialog({ isOpen: false, user: null, isLoading: false });
  };

  const getStatusBadge = (user: any) => {
    if (!user.is_active) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Inactive</span>;
    }
    
    switch (user.registration_stage) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Completed</span>;
      case 'description_pending':
        return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Description Pending</span>;
      case 'details_pending':
        return <span className="px-2 py-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full">Details Pending</span>;
      case 'initial':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Initial Registration</span>;
      case 'activated':
        return <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">Activated</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Unknown</span>;
    }
  };

  const getRegistrationProgress = (user: any) => {
    const stages = ['activated', 'initial', 'details_pending', 'description_pending', 'completed'];
    const currentIndex = stages.indexOf(user.registration_stage);
    const progress = currentIndex >= 0 ? ((currentIndex + 1) / stages.length) * 100 : 0;
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
        <div 
          className="bg-emerald-600 h-2 rounded-full transition-all duration-300" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    );
  };

  const getNextStep = (user: any) => {
    switch (user.registration_stage) {
      case 'activated':
        return 'Send: start#name#age#gender#county#town';
      case 'initial':
        return 'Send: details#education#profession#marital#religion#ethnicity';
      case 'details_pending':
        return 'Send: MYSELF description';
      case 'description_pending':
        return 'Complete your profile by adding your description';
      case 'completed':
        return 'Can search matches with: match#age#town';
      default:
        return 'Send: PENZI to activate';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-poppins text-gray-900">Users Management</h1>
          <p className="text-gray-600 font-poppins">Manage and monitor user accounts through the 8-step registration process</p>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-600">
            {state.usersPagination?.total || 0} total users
          </span>
        </div>
      </div>

      {/* Registration Steps Guide */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-emerald-800 mb-2">Registration Stages</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
            <span className="text-purple-700">Activated</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
            <span className="text-yellow-700">Initial Registration</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-teal-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
            <span className="text-teal-700">Details Pending</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
            <span className="text-orange-700">Description Pending</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">5</span>
            <span className="text-green-700">Completed</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, phone, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={state.userFilters.status || 'all'}
              onChange={(e) => handleStatusFilter(e.target.value as UserStatus)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Users</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow">
        {state.usersLoading ? (
          <div className="p-8">
            <Loading text="Loading users..." />
          </div>
        ) : state.users.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No users found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registration Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Step
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {state.users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || 'No name'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.age ? `${user.age} years old` : 'Age not set'} • {user.gender || 'Gender not set'}
                            </div>
                            {getRegistrationProgress(user)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {user.phone_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          {user.town && user.county ? `${user.town}, ${user.county}` : 'Location not set'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getStatusBadge(user)}
                          <div className="text-xs text-gray-500">
                            Registered: {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-600 max-w-xs">
                          {getNextStep(user)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {user.is_active ? (
                            <button
                              onClick={() => handleDeactivateUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Deactivate user"
                            >
                              <UserX className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateUser(user.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Activate user"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden">
              {state.users.map((user) => (
                <div key={user.id} className="p-4 border-b border-gray-200 last:border-b-0">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {user.name || 'No name'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user.phone_number}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user.town && user.county ? `${user.town}, ${user.county}` : 'Location not set'}
                          </p>
                          {getRegistrationProgress(user)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(user)}
                        <div className="flex space-x-1">
                          {user.is_active ? (
                            <button
                              onClick={() => handleDeactivateUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <UserX className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateUser(user.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      <strong>Next Step:</strong> {getNextStep(user)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {state.usersPagination && state.usersPagination.pages > 1 && (
              <Pagination
                currentPage={state.usersPagination.page}
                totalPages={state.usersPagination.pages}
                totalItems={state.usersPagination.total}
                itemsPerPage={state.usersPagination.per_page}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={cancelDeleteUser}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={`Are you sure you want to permanently delete ${deleteDialog.user?.name || 'this user'}? This action cannot be undone and will remove all associated data including matches, messages, and interests.`}
        confirmText="Delete User"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteDialog.isLoading}
      />
    </div>
  );
};

export default UsersTab;