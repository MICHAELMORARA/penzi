'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { User, UserStats } from '../api/userApi';
import { DashboardAnalytics, Match, Interest, SmsMessage, Conversation } from '../api/dashboardApi';

// State interface
export interface AppState {
  // Loading states
  loading: boolean;
  error: string | null;
  
  // User data
  users: User[];
  currentUser: User | null;
  userStats: UserStats | null;
  usersLoading: boolean;
  usersPagination: {
    page: number;
    pages: number;
    per_page: number;
    total: number;
  } | null;
  
  // Dashboard data
  dashboardAnalytics: DashboardAnalytics | null;
  matches: Match[];
  matchesLoading: boolean;
  matchesPagination: {
    page: number;
    pages: number;
    per_page: number;
    total: number;
  } | null;
  
  interests: Interest[];
  interestsLoading: boolean;
  interestsPagination: {
    page: number;
    pages: number;
    per_page: number;
    total: number;
  } | null;
  
  messages: SmsMessage[];
  messagesLoading: boolean;
  messagesPagination: {
    page: number;
    pages: number;
    per_page: number;
    total: number;
  } | null;
  
  conversations: Conversation[];
  conversationsLoading: boolean;
  
  // UI state
  activeTab: string;
  sidebarOpen: boolean;
  unreadNotifications: number;
  
  // Filters
  userFilters: {
    status: string;
    search: string;
    page: number;
  };
  matchFilters: {
    status: 'all' | 'active' | 'pending' | 'expired';
    page: number;
    compatibility?: 'all' | 'high' | 'medium' | 'low';
    sort?: 'newest' | 'oldest' | 'compatibility';
  };
  interestFilters: {
    response: 'all' | 'pending' | 'YES' | 'NO';
    page: number;
  };
  messageFilters: {
    direction: 'all' | 'inbound' | 'outbound';
    message_type: string;
    page: number;
  };
}

// Initial state
const initialState: AppState = {
  loading: false,
  error: null,
  
  users: [],
  currentUser: null,
  userStats: null,
  usersLoading: false,
  usersPagination: null,
  
  dashboardAnalytics: null,
  matches: [],
  matchesLoading: false,
  matchesPagination: null,
  
  interests: [],
  interestsLoading: false,
  interestsPagination: null,
  
  messages: [],
  messagesLoading: false,
  messagesPagination: null,
  
  conversations: [],
  conversationsLoading: false,
  
  activeTab: 'overview',
  sidebarOpen: false,
  unreadNotifications: 0,
  
  userFilters: {
    status: 'all',
    search: '',
    page: 1,
  },
  matchFilters: {
    status: 'all' as const,
    page: 1,
    compatibility: 'all' as const,
    sort: 'newest' as const,
  },
  interestFilters: {
    response: 'all',
    page: 1,
  },
  messageFilters: {
    direction: 'all' as const,
    message_type: 'all',
    page: 1,
  },
};

// Action types
export enum ActionType {
  // Loading actions
  SET_LOADING = 'SET_LOADING',
  SET_ERROR = 'SET_ERROR',
  CLEAR_ERROR = 'CLEAR_ERROR',
  
  // User actions
  SET_USERS = 'SET_USERS',
  SET_USERS_LOADING = 'SET_USERS_LOADING',
  SET_CURRENT_USER = 'SET_CURRENT_USER',
  SET_USER_STATS = 'SET_USER_STATS',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  
  // Dashboard actions
  SET_DASHBOARD_ANALYTICS = 'SET_DASHBOARD_ANALYTICS',
  SET_MATCHES = 'SET_MATCHES',
  SET_MATCHES_LOADING = 'SET_MATCHES_LOADING',
  SET_INTERESTS = 'SET_INTERESTS',
  SET_INTERESTS_LOADING = 'SET_INTERESTS_LOADING',
  SET_MESSAGES = 'SET_MESSAGES',
  SET_MESSAGES_LOADING = 'SET_MESSAGES_LOADING',
  SET_CONVERSATIONS = 'SET_CONVERSATIONS',
  SET_CONVERSATIONS_LOADING = 'SET_CONVERSATIONS_LOADING',
  ADD_MESSAGE = 'ADD_MESSAGE',
  
  // UI actions
  SET_ACTIVE_TAB = 'SET_ACTIVE_TAB',
  SET_SIDEBAR_OPEN = 'SET_SIDEBAR_OPEN',
  SET_UNREAD_NOTIFICATIONS = 'SET_UNREAD_NOTIFICATIONS',
  INCREMENT_NOTIFICATIONS = 'INCREMENT_NOTIFICATIONS',
  CLEAR_NOTIFICATIONS = 'CLEAR_NOTIFICATIONS',
  
  // Filter actions
  SET_USER_FILTERS = 'SET_USER_FILTERS',
  SET_MATCH_FILTERS = 'SET_MATCH_FILTERS',
  SET_INTEREST_FILTERS = 'SET_INTEREST_FILTERS',
  SET_MESSAGE_FILTERS = 'SET_MESSAGE_FILTERS',
}

// Action interfaces
export interface Action {
  type: ActionType;
  payload?: any;
}

// Reducer
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case ActionType.SET_LOADING:
      return { ...state, loading: action.payload };
      
    case ActionType.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
      
    case ActionType.CLEAR_ERROR:
      return { ...state, error: null };
      
    case ActionType.SET_USERS:
      return {
        ...state,
        users: action.payload.users || action.payload,
        usersPagination: action.payload.pagination || null,
        usersLoading: false,
      };
      
    case ActionType.SET_USERS_LOADING:
      return { ...state, usersLoading: action.payload };
      
    case ActionType.SET_CURRENT_USER:
      return { ...state, currentUser: action.payload };
      
    case ActionType.SET_USER_STATS:
      return { ...state, userStats: action.payload };
      
    case ActionType.UPDATE_USER:
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload.id ? action.payload : user
        ),
        currentUser: state.currentUser?.id === action.payload.id ? action.payload : state.currentUser,
      };
      
    case ActionType.DELETE_USER:
      return {
        ...state,
        users: state.users.filter(user => user.id !== action.payload),
        currentUser: state.currentUser?.id === action.payload ? null : state.currentUser,
      };
      
    case ActionType.SET_DASHBOARD_ANALYTICS:
      return { ...state, dashboardAnalytics: action.payload };
      
    case ActionType.SET_MATCHES:
      return {
        ...state,
        matches: action.payload.matches || action.payload,
        matchesPagination: action.payload.pagination || null,
        matchesLoading: false,
      };
      
    case ActionType.SET_MATCHES_LOADING:
      return { ...state, matchesLoading: action.payload };
      
    case ActionType.SET_INTERESTS:
      return {
        ...state,
        interests: action.payload.interests || action.payload,
        interestsPagination: action.payload.pagination || null,
        interestsLoading: false,
      };
      
    case ActionType.SET_INTERESTS_LOADING:
      return { ...state, interestsLoading: action.payload };
      
    case ActionType.SET_MESSAGES:
      return {
        ...state,
        messages: action.payload.messages || action.payload,
        messagesPagination: action.payload.pagination || null,
        messagesLoading: false,
      };
      
    case ActionType.SET_MESSAGES_LOADING:
      return { ...state, messagesLoading: action.payload };
      
    case ActionType.SET_CONVERSATIONS:
      return {
        ...state,
        conversations: action.payload.conversations || action.payload,
        conversationsLoading: false,
      };
      
    case ActionType.SET_CONVERSATIONS_LOADING:
      return { ...state, conversationsLoading: action.payload };
      
    case ActionType.ADD_MESSAGE:
      return {
        ...state,
        messages: [action.payload, ...state.messages],
        conversations: state.conversations.map(conv =>
          conv.phone_number === action.payload.to_phone || conv.phone_number === action.payload.from_phone
            ? {
                ...conv,
                messages: [...conv.messages, action.payload],
                last_message: action.payload.message_body,
                last_message_time: action.payload.timestamp,
              }
            : conv
        ),
      };
      
    case ActionType.SET_ACTIVE_TAB:
      return { ...state, activeTab: action.payload };
      
    case ActionType.SET_SIDEBAR_OPEN:
      return { ...state, sidebarOpen: action.payload };
      
    case ActionType.SET_UNREAD_NOTIFICATIONS:
      return { ...state, unreadNotifications: action.payload };
      
    case ActionType.INCREMENT_NOTIFICATIONS:
      return { ...state, unreadNotifications: state.unreadNotifications + 1 };
      
    case ActionType.CLEAR_NOTIFICATIONS:
      return { ...state, unreadNotifications: 0 };
      
    case ActionType.SET_USER_FILTERS:
      return { ...state, userFilters: { ...state.userFilters, ...action.payload } };
      
    case ActionType.SET_MATCH_FILTERS:
      return { ...state, matchFilters: { ...state.matchFilters, ...action.payload } };
      
    case ActionType.SET_INTEREST_FILTERS:
      return { ...state, interestFilters: { ...state.interestFilters, ...action.payload } };
      
    case ActionType.SET_MESSAGE_FILTERS:
      return { ...state, messageFilters: { ...state.messageFilters, ...action.payload } };
      
    default:
      return state;
  }
}

// Action creators
export const actions = {
  setLoading: (loading: boolean): Action => ({
    type: ActionType.SET_LOADING,
    payload: loading,
  }),
  
  setError: (error: string): Action => ({
    type: ActionType.SET_ERROR,
    payload: error,
  }),
  
  clearError: (): Action => ({
    type: ActionType.CLEAR_ERROR,
  }),
  
  setUsers: (data: any): Action => ({
    type: ActionType.SET_USERS,
    payload: data,
  }),
  
  setUsersLoading: (loading: boolean): Action => ({
    type: ActionType.SET_USERS_LOADING,
    payload: loading,
  }),
  
  setCurrentUser: (user: User | null): Action => ({
    type: ActionType.SET_CURRENT_USER,
    payload: user,
  }),
  
  setUserStats: (stats: UserStats): Action => ({
    type: ActionType.SET_USER_STATS,
    payload: stats,
  }),
  
  updateUser: (user: User): Action => ({
    type: ActionType.UPDATE_USER,
    payload: user,
  }),
  
  deleteUser: (userId: number): Action => ({
    type: ActionType.DELETE_USER,
    payload: userId,
  }),
  
  setDashboardAnalytics: (analytics: DashboardAnalytics): Action => ({
    type: ActionType.SET_DASHBOARD_ANALYTICS,
    payload: analytics,
  }),
  
  setMatches: (data: any): Action => ({
    type: ActionType.SET_MATCHES,
    payload: data,
  }),
  
  setMatchesLoading: (loading: boolean): Action => ({
    type: ActionType.SET_MATCHES_LOADING,
    payload: loading,
  }),
  
  setInterests: (data: any): Action => ({
    type: ActionType.SET_INTERESTS,
    payload: data,
  }),
  
  setInterestsLoading: (loading: boolean): Action => ({
    type: ActionType.SET_INTERESTS_LOADING,
    payload: loading,
  }),
  
  setMessages: (data: any): Action => ({
    type: ActionType.SET_MESSAGES,
    payload: data,
  }),
  
  setMessagesLoading: (loading: boolean): Action => ({
    type: ActionType.SET_MESSAGES_LOADING,
    payload: loading,
  }),
  
  setConversations: (data: any): Action => ({
    type: ActionType.SET_CONVERSATIONS,
    payload: data,
  }),
  
  setConversationsLoading: (loading: boolean): Action => ({
    type: ActionType.SET_CONVERSATIONS_LOADING,
    payload: loading,
  }),
  
  addMessage: (message: SmsMessage): Action => ({
    type: ActionType.ADD_MESSAGE,
    payload: message,
  }),
  
  setActiveTab: (tab: string): Action => ({
    type: ActionType.SET_ACTIVE_TAB,
    payload: tab,
  }),
  
  setSidebarOpen: (open: boolean): Action => ({
    type: ActionType.SET_SIDEBAR_OPEN,
    payload: open,
  }),
  
  setUnreadNotifications: (count: number): Action => ({
    type: ActionType.SET_UNREAD_NOTIFICATIONS,
    payload: count,
  }),
  
  incrementNotifications: (): Action => ({
    type: ActionType.INCREMENT_NOTIFICATIONS,
  }),
  
  clearNotifications: (): Action => ({
    type: ActionType.CLEAR_NOTIFICATIONS,
  }),
  
  setUserFilters: (filters: Partial<AppState['userFilters']>): Action => ({
    type: ActionType.SET_USER_FILTERS,
    payload: filters,
  }),
  
  setMatchFilters: (filters: Partial<AppState['matchFilters']>): Action => ({
    type: ActionType.SET_MATCH_FILTERS,
    payload: filters,
  }),
  
  setInterestFilters: (filters: Partial<AppState['interestFilters']>): Action => ({
    type: ActionType.SET_INTEREST_FILTERS,
    payload: filters,
  }),
  
  setMessageFilters: (filters: Partial<AppState['messageFilters']>): Action => ({
    type: ActionType.SET_MESSAGE_FILTERS,
    payload: filters,
  }),
};

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

// Provider component
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export default AppContext;