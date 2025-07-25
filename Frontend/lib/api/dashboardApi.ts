import { apiClient, ApiResponse, PaginationParams, PaginatedResponse } from './apiClient';

export interface DashboardAnalytics {
  success_rate: number;
  total_interests: number;
  positive_responses: number;
  conversion_rate: number;
}

export interface Match {
  id: number;
  requester: {
    id: number;
    name: string;
    phone: string;
    age: number;
    town: string;
  };
  matched_user: {
    id: number;
    name: string;
    phone: string;
    age: number;
    town: string;
  };
  status: string;
  compatibility_score: number;
  created_at: string;
}

export interface Interest {
  id: number;
  interested_user: {
    id: number;
    name: string;
    phone: string;
  };
  target_user: {
    id: number;
    name: string;
    phone: string;
  };
  interest_type: string;
  response: string | null;
  notification_sent: boolean;
  response_received: boolean;
  feedback_sent: boolean;
  created_at: string;
  response_at: string | null;
}

export interface SmsMessage {
  id: number;
  from_phone: string;
  to_phone: string;
  message_body: string;
  direction: 'incoming' | 'outgoing';
  message_type: string;
  related_user_id: number | null;
  user_name: string | null;
  timestamp: string;
}

export interface Conversation {
  phone_number: string;
  user_name: string;
  last_message: string;
  last_message_time: string | null;
  message_count: number;
  messages: SmsMessage[];
}

export interface RecentActivity {
  recent_matches: Match[];
  recent_interests: Interest[];
  recent_messages: SmsMessage[];
}

export interface MatchSearchParams extends PaginationParams {
  status?: 'all' | 'active' | 'pending' | 'expired';
  compatibility?: 'all' | 'high' | 'medium' | 'low';
  sort?: 'newest' | 'oldest' | 'compatibility';
}

export interface InterestSearchParams extends PaginationParams {
  response?: 'all' | 'pending' | 'YES' | 'NO';
}

export interface MessageSearchParams extends PaginationParams {
  direction?: 'all' | 'inbound' | 'outbound';
  message_type?: string;
}

export class DashboardApi {
  // Get analytics data
  async getAnalytics(): Promise<ApiResponse<DashboardAnalytics>> {
    return apiClient.get<DashboardAnalytics>('/api/dashboard/analytics');
  }

  // Get matches with pagination and filters
  async getMatches(params: MatchSearchParams = {}): Promise<ApiResponse<PaginatedResponse<Match>>> {
    return apiClient.get<PaginatedResponse<Match>>('/api/dashboard/matches', params);
  }

  // Get interests with pagination and filters
  async getInterests(params: InterestSearchParams = {}): Promise<ApiResponse<PaginatedResponse<Interest>>> {
    return apiClient.get<PaginatedResponse<Interest>>('/api/dashboard/interests', params);
  }

  // Get messages with pagination and filters
  async getMessages(params: MessageSearchParams = {}): Promise<ApiResponse<PaginatedResponse<SmsMessage>>> {
    return apiClient.get<PaginatedResponse<SmsMessage>>('/api/dashboard/messages', params);
  }

  // Get conversations for live chat
  async getConversations(): Promise<ApiResponse<{ conversations: Conversation[] }>> {
    return apiClient.get<{ conversations: Conversation[] }>('/api/dashboard/conversations');
  }

  // Send message
  async sendMessage(data: {
    to_phone: string;
    message: string;
  }): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/dashboard/send-message', data);
  }

  // Get recent activity
  async getRecentActivity(): Promise<ApiResponse<RecentActivity>> {
    return apiClient.get<RecentActivity>('/api/dashboard/recent-activity');
  }
}

export const dashboardApi = new DashboardApi();