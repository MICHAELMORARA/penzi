import { apiClient, ApiResponse, PaginationParams, PaginatedResponse } from './apiClient';

export interface User {
  id: number;
  phone_number: string;
  name?: string;
  age?: number;
  gender?: string;
  county?: string;
  town?: string;
  level_of_education?: string;
  profession?: string;
  marital_status?: string;
  religion?: string;
  ethnicity?: string;
  self_description?: string;
  registration_stage: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  completed_registrations: number;
  pending_registrations: number;
  male_users: number;
  female_users: number;
  average_age: number;
  registrations_today: number;
  registrations_this_week: number;
  registrations_this_month: number;
}

export interface UserSearchParams extends PaginationParams {
  status?: 'all' | 'active' | 'inactive' | 'completed' | 'pending';
  search?: string;
}

export interface UserRegistrationData {
  phone_number: string;
  name: string;
  age: number;
  gender: string;
  county: string;
  town: string;
  level_of_education?: string;
  profession?: string;
  marital_status?: string;
  religion?: string;
  ethnicity?: string;
  self_description?: string;
}

export class UserApi {
  // Get user statistics
  async getStats(): Promise<ApiResponse<UserStats>> {
    return apiClient.get<UserStats>('/api/users/stats');
  }

  // Get users with pagination and filters
  async getUsers(params: UserSearchParams = {}): Promise<ApiResponse<PaginatedResponse<User>>> {
    return apiClient.get<PaginatedResponse<User>>('/api/dashboard/users', params);
  }

  // Get user by ID
  async getUserById(userId: number): Promise<ApiResponse<User>> {
    return apiClient.get<User>(`/api/users/profile/${userId}`);
  }

  // Get user by phone number
  async getUserByPhone(phoneNumber: string): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/api/users/profile/phone', { phone_number: phoneNumber });
  }

  // Register new user
  async registerUser(userData: UserRegistrationData): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/api/users/register', userData);
  }

  // Complete basic registration
  async completeBasicRegistration(userData: Partial<UserRegistrationData>): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/api/users/complete-basic', userData);
  }

  // Complete detailed registration
  async completeDetailedRegistration(data: {
    user_id: number;
    level_of_education: string;
    profession: string;
    marital_status: string;
    religion: string;
    ethnicity: string;
  }): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/api/users/complete-details', data);
  }

  // Add user description
  async addUserDescription(data: {
    user_id: number;
    self_description: string;
  }): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/api/users/add-description', data);
  }

  // Update user
  async updateUser(userId: number, updateData: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.put<User>(`/api/users/update/${userId}`, updateData);
  }

  // Search users
  async searchUsers(searchParams: {
    county?: string;
    town?: string;
    gender?: string;
    age_min?: number;
    age_max?: number;
    exclude_user_id?: number;
  }): Promise<ApiResponse<{ users: User[]; count: number }>> {
    return apiClient.post<{ users: User[]; count: number }>('/api/users/search', searchParams);
  }

  // Activate user
  async activateUser(userId: number): Promise<ApiResponse<void>> {
    return apiClient.put<void>(`/api/users/activate/${userId}`);
  }

  // Deactivate user
  async deactivateUser(userId: number): Promise<ApiResponse<void>> {
    return apiClient.put<void>(`/api/users/deactivate/${userId}`);
  }

  // Delete user
  async deleteUser(userId: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/users/delete/${userId}`);
  }
}

export const userApi = new UserApi();