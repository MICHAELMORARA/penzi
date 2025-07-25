export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  profilePicture?: string;
  age?: number;
  bio?: string;
  interests?: string[];
  location?: string;
  isVerified: boolean;
  isPremium: boolean;
  registrationStage?: string;
  isRegistrationComplete?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  username: string;
  age: number;
  role?: 'user' | 'admin';
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface Match {
  id: string;
  userId: string;
  matchedUserId: string;
  user: User;
  matchedUser: User;
  isLiked: boolean;
  isMutual: boolean;
  createdAt: string;
}

export interface SwipeAction {
  userId: string;
  targetUserId: string;
  action: 'like' | 'pass';
}

export interface PaymentRequest {
  amount: number;
  phoneNumber: string;
  description: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  checkoutRequestId: string;
  message: string;
}