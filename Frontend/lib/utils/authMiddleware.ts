import Cookies from 'js-cookie';
import { authApi } from '@/lib/api/auth';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

export const setupAuthInterceptors = () => {
  // Add request interceptor to include auth token
  const requestInterceptor = (config: any) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  };

  // Add response interceptor to handle token refresh
  const responseInterceptor = {
    onFulfilled: (response: any) => response,
    onRejected: async (error: any) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return fetch(originalRequest.url, originalRequest);
          }).catch(err => {
            return Promise.reject(err);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = Cookies.get('refreshToken');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await authApi.refreshToken(refreshToken);
          const { token: newToken } = response;

          // Update stored tokens
          Cookies.set('token', newToken, { expires: 7, secure: true, sameSite: 'strict' });
          
          // Update cache timestamp to avoid unnecessary auth checks
          localStorage.setItem('lastAuthCheck', Date.now().toString());

          processQueue(null, newToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return fetch(originalRequest.url, originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          
          // Clear all auth data
          Cookies.remove('token');
          Cookies.remove('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('lastAuthCheck');
          
          // Redirect to login
          window.location.href = '/login';
          
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  };

  return { requestInterceptor, responseInterceptor };
};

// Token validation utility
export const isTokenValid = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp > currentTime;
  } catch {
    return false;
  }
};

// Check if token needs refresh (expires in less than 5 minutes)
export const shouldRefreshToken = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    const fiveMinutes = 5 * 60;
    return payload.exp - currentTime < fiveMinutes;
  } catch {
    return true;
  }
};