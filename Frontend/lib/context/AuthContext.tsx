'use client';

import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { User, AuthState, LoginCredentials, RegisterCredentials, AuthResponse } from '@/lib/types/auth';
import { authApi } from '@/lib/api/auth';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<{ success: boolean } | void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const authCheckRef = useRef<boolean>(false);
  const lastAuthCheckRef = useRef<number>(0);

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await authApi.login(credentials);
      
      // Store tokens with longer expiry
      Cookies.set('token', response.token, { expires: 7, secure: true, sameSite: 'strict' });
      Cookies.set('refreshToken', response.refreshToken, { expires: 30, secure: true, sameSite: 'strict' });
      
      // Cache user data in localStorage for faster subsequent loads
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('lastAuthCheck', Date.now().toString());
      
      dispatch({ type: 'SET_USER', payload: response.user });
      toast.success('Login successful!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await authApi.register(credentials);
      
      // Don't store tokens or set user - let them login manually
      // This ensures they navigate to login page after registration
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.success('Registration successful! Please login with your credentials.');
      
      // Return success to indicate registration was successful
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      
      // Re-throw the error so the component can handle it
      throw error;
    }
  };

  const logout = () => {
    Cookies.remove('token');
    Cookies.remove('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('lastAuthCheck');
    authCheckRef.current = false;
    lastAuthCheckRef.current = 0;
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
  };

  const updateUser = (userData: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
    
    // Update cached user data
    if (state.user) {
      const updatedUser = { ...state.user, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const checkAuth = async () => {
    // Prevent multiple simultaneous auth checks
    if (authCheckRef.current) {
      return;
    }

    try {
      const token = Cookies.get('token');
      if (!token) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      // Check if we have cached user data and it's recent (less than 5 minutes old)
      const cachedUser = localStorage.getItem('user');
      const lastAuthCheck = localStorage.getItem('lastAuthCheck');
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (cachedUser && lastAuthCheck && (now - parseInt(lastAuthCheck)) < fiveMinutes) {
        // Use cached data to avoid API call
        const user = JSON.parse(cachedUser);
        dispatch({ type: 'SET_USER', payload: user });
        return;
      }

      authCheckRef.current = true;
      
      // Only make API call if cache is stale or doesn't exist
      const user = await authApi.getCurrentUser();
      
      // Update cache
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('lastAuthCheck', now.toString());
      lastAuthCheckRef.current = now;
      
      dispatch({ type: 'SET_USER', payload: user });
    } catch (error) {
      // Token might be expired or invalid
      Cookies.remove('token');
      Cookies.remove('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('lastAuthCheck');
      dispatch({ type: 'LOGOUT' });
    } finally {
      authCheckRef.current = false;
    }
  };

  useEffect(() => {
    // Only check auth once on mount
    if (!authCheckRef.current) {
      checkAuth();
    }
  }, []);

  const value: AuthContextType = {
    state,
    login,
    register,
    logout,
    updateUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}