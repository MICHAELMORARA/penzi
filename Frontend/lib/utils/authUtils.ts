import Cookies from 'js-cookie';

/**
 * Clear all authentication data and force logout
 */
export const clearAuthData = () => {
  // Remove cookies
  Cookies.remove('token');
  Cookies.remove('refreshToken');
  
  // Remove localStorage data
  localStorage.removeItem('user');
  localStorage.removeItem('lastAuthCheck');
  
  // Clear any other auth-related data
  sessionStorage.clear();
  
  console.log('🧹 All authentication data cleared');
};

/**
 * Check if user has valid authentication
 */
export const hasValidAuth = (): boolean => {
  const token = Cookies.get('token');
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp > currentTime;
  } catch {
    return false;
  }
};

/**
 * Force logout and redirect to login page
 */
export const forceLogout = () => {
  clearAuthData();
  window.location.href = '/login';
};

// Make utilities available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).clearAuthData = clearAuthData;
  (window as any).hasValidAuth = hasValidAuth;
  (window as any).forceLogout = forceLogout;
  console.log('🔧 Auth utilities available: clearAuthData(), hasValidAuth(), forceLogout()');
}