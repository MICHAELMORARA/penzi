'use client';

import { useCallback } from 'react';
import { useAppContext, actions } from '../context/AppContext';
import { userApi, UserSearchParams, UserRegistrationData } from '../api/userApi';
import { dashboardApi, MatchSearchParams, InterestSearchParams, MessageSearchParams } from '../api/dashboardApi';

export const useUserApi = () => {
  const { dispatch } = useAppContext();

  const getUsers = useCallback(async (params: UserSearchParams = {}) => {
    try {
      dispatch(actions.setUsersLoading(true));
      const response = await userApi.getUsers(params);
      
      if (response.success && response.data) {
        dispatch(actions.setUsers(response.data));
      } else {
        dispatch(actions.setError(response.message || 'Failed to fetch users'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
      dispatch(actions.setError(errorMessage));
      throw error;
    } finally {
      dispatch(actions.setUsersLoading(false));
    }
  }, [dispatch]);

  const getUserStats = useCallback(async () => {
    try {
      const response = await userApi.getStats();
      
      if (response.success && response.data) {
        dispatch(actions.setUserStats(response.data));
      } else {
        dispatch(actions.setError(response.message || 'Failed to fetch user stats'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user stats';
      dispatch(actions.setError(errorMessage));
      throw error;
    }
  }, [dispatch]);

  const getUserById = useCallback(async (userId: number) => {
    try {
      dispatch(actions.setLoading(true));
      const response = await userApi.getUserById(userId);
      
      if (response.success && response.data) {
        dispatch(actions.setCurrentUser(response.data));
      } else {
        dispatch(actions.setError(response.message || 'Failed to fetch user'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user';
      dispatch(actions.setError(errorMessage));
      throw error;
    } finally {
      dispatch(actions.setLoading(false));
    }
  }, [dispatch]);

  const getUserByPhone = useCallback(async (phoneNumber: string) => {
    try {
      dispatch(actions.setLoading(true));
      const response = await userApi.getUserByPhone(phoneNumber);
      
      if (response.success && response.data) {
        dispatch(actions.setCurrentUser(response.data));
      } else {
        dispatch(actions.setError(response.message || 'Failed to fetch user'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user';
      dispatch(actions.setError(errorMessage));
      throw error;
    } finally {
      dispatch(actions.setLoading(false));
    }
  }, [dispatch]);

  const registerUser = useCallback(async (userData: UserRegistrationData) => {
    try {
      dispatch(actions.setLoading(true));
      const response = await userApi.registerUser(userData);
      
      if (response.success && response.data) {
        dispatch(actions.setCurrentUser(response.data));
      } else {
        dispatch(actions.setError(response.message || 'Failed to register user'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to register user';
      dispatch(actions.setError(errorMessage));
      throw error;
    } finally {
      dispatch(actions.setLoading(false));
    }
  }, [dispatch]);

  const updateUser = useCallback(async (userId: number, updateData: any) => {
    try {
      dispatch(actions.setLoading(true));
      const response = await userApi.updateUser(userId, updateData);
      
      if (response.success && response.data) {
        dispatch(actions.updateUser(response.data));
      } else {
        dispatch(actions.setError(response.message || 'Failed to update user'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      dispatch(actions.setError(errorMessage));
      throw error;
    } finally {
      dispatch(actions.setLoading(false));
    }
  }, [dispatch]);

  const deleteUser = useCallback(async (userId: number) => {
    try {
      dispatch(actions.setLoading(true));
      const response = await userApi.deleteUser(userId);
      
      if (response.success) {
        dispatch(actions.deleteUser(userId));
      } else {
        dispatch(actions.setError(response.message || 'Failed to delete user'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      dispatch(actions.setError(errorMessage));
      throw error;
    } finally {
      dispatch(actions.setLoading(false));
    }
  }, [dispatch]);

  const activateUser = useCallback(async (userId: number) => {
    try {
      const response = await userApi.activateUser(userId);
      
      if (response.success) {
        // Refresh users list
        await getUsers();
      } else {
        dispatch(actions.setError(response.message || 'Failed to activate user'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to activate user';
      dispatch(actions.setError(errorMessage));
      throw error;
    }
  }, [dispatch, getUsers]);

  const deactivateUser = useCallback(async (userId: number) => {
    try {
      const response = await userApi.deactivateUser(userId);
      
      if (response.success) {
        // Refresh users list
        await getUsers();
      } else {
        dispatch(actions.setError(response.message || 'Failed to deactivate user'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to deactivate user';
      dispatch(actions.setError(errorMessage));
      throw error;
    }
  }, [dispatch, getUsers]);

  return {
    getUsers,
    getUserStats,
    getUserById,
    getUserByPhone,
    registerUser,
    updateUser,
    deleteUser,
    activateUser,
    deactivateUser,
  };
};

export const useDashboardApi = () => {
  const { dispatch } = useAppContext();

  const getAnalytics = useCallback(async () => {
    try {
      const response = await dashboardApi.getAnalytics();
      
      if (response.success && response.data) {
        dispatch(actions.setDashboardAnalytics(response.data));
      } else {
        dispatch(actions.setError(response.message || 'Failed to fetch analytics'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch analytics';
      dispatch(actions.setError(errorMessage));
      throw error;
    }
  }, [dispatch]);

  const getMatches = useCallback(async (params: MatchSearchParams = {}) => {
    try {
      dispatch(actions.setMatchesLoading(true));
      const response = await dashboardApi.getMatches(params);
      
      if (response.success && response.data) {
        dispatch(actions.setMatches(response.data));
      } else {
        dispatch(actions.setError(response.message || 'Failed to fetch matches'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch matches';
      dispatch(actions.setError(errorMessage));
      throw error;
    } finally {
      dispatch(actions.setMatchesLoading(false));
    }
  }, [dispatch]);

  const getInterests = useCallback(async (params: InterestSearchParams = {}) => {
    try {
      dispatch(actions.setInterestsLoading(true));
      const response = await dashboardApi.getInterests(params);
      
      if (response.success && response.data) {
        dispatch(actions.setInterests(response.data));
      } else {
        dispatch(actions.setError(response.message || 'Failed to fetch interests'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch interests';
      dispatch(actions.setError(errorMessage));
      throw error;
    } finally {
      dispatch(actions.setInterestsLoading(false));
    }
  }, [dispatch]);

  const getMessages = useCallback(async (params: MessageSearchParams = {}) => {
    try {
      dispatch(actions.setMessagesLoading(true));
      const response = await dashboardApi.getMessages(params);
      
      if (response.success && response.data) {
        dispatch(actions.setMessages(response.data));
      } else {
        dispatch(actions.setError(response.message || 'Failed to fetch messages'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch messages';
      dispatch(actions.setError(errorMessage));
      throw error;
    } finally {
      dispatch(actions.setMessagesLoading(false));
    }
  }, [dispatch]);

  const getConversations = useCallback(async () => {
    try {
      dispatch(actions.setConversationsLoading(true));
      const response = await dashboardApi.getConversations();
      
      if (response.success && response.data) {
        dispatch(actions.setConversations(response.data));
      } else {
        dispatch(actions.setError(response.message || 'Failed to fetch conversations'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch conversations';
      dispatch(actions.setError(errorMessage));
      throw error;
    } finally {
      dispatch(actions.setConversationsLoading(false));
    }
  }, [dispatch]);

  const sendMessage = useCallback(async (data: { to_phone: string; message: string }) => {
    try {
      const response = await dashboardApi.sendMessage(data);
      
      if (response.success) {
        // Add the message to the state
        const newMessage = {
          id: Date.now(), // Temporary ID
          from_phone: 'admin',
          to_phone: data.to_phone,
          message_body: data.message,
          direction: 'outgoing' as const,
          message_type: 'admin_message',
          related_user_id: null,
          user_name: null,
          timestamp: new Date().toISOString(),
        };
        dispatch(actions.addMessage(newMessage));
      } else {
        dispatch(actions.setError(response.message || 'Failed to send message'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      dispatch(actions.setError(errorMessage));
      throw error;
    }
  }, [dispatch]);

  const getRecentActivity = useCallback(async () => {
    try {
      const response = await dashboardApi.getRecentActivity();
      
      if (!response.success) {
        dispatch(actions.setError(response.message || 'Failed to fetch recent activity'));
      }
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recent activity';
      dispatch(actions.setError(errorMessage));
      throw error;
    }
  }, [dispatch]);

  return {
    getAnalytics,
    getMatches,
    getInterests,
    getMessages,
    getConversations,
    sendMessage,
    getRecentActivity,
  };
};