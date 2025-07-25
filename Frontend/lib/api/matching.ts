import api from './auth';
import { User, Match, SwipeAction, PaymentRequest, PaymentResponse } from '@/lib/types/auth';

export const matchingApi = {
  // Get potential matches for swiping
  getPotentialMatches: async (): Promise<User[]> => {
    const response = await api.get('/matching/potential');
    return response.data;
  },

  // Swipe action (like or pass)
  swipe: async (swipeAction: SwipeAction): Promise<{ isMatch: boolean; match?: Match }> => {
    const response = await api.post('/matching/swipe', swipeAction);
    return response.data;
  },

  // Get user's matches
  getMatches: async (): Promise<Match[]> => {
    const response = await api.get('/matching/matches');
    return response.data;
  },

  // Get match details
  getMatchDetails: async (matchId: string): Promise<Match> => {
    const response = await api.get(`/matching/matches/${matchId}`);
    return response.data;
  },

  // Unmatch with someone
  unmatch: async (matchId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/matching/matches/${matchId}`);
    return response.data;
  },

  // Report a user
  reportUser: async (userId: string, reason: string): Promise<{ message: string }> => {
    const response = await api.post('/matching/report', { userId, reason });
    return response.data;
  },

  // Block a user
  blockUser: async (userId: string): Promise<{ message: string }> => {
    const response = await api.post('/matching/block', { userId });
    return response.data;
  },

  // Get blocked users
  getBlockedUsers: async (): Promise<User[]> => {
    const response = await api.get('/matching/blocked');
    return response.data;
  },

  // Unblock a user
  unblockUser: async (userId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/matching/blocked/${userId}`);
    return response.data;
  },
};

export const paymentApi = {
  // Initiate M-Pesa STK Push
  initiateMpesaPayment: async (paymentRequest: PaymentRequest): Promise<PaymentResponse> => {
    const response = await api.post('/payments/mpesa/stkpush', paymentRequest);
    return response.data;
  },

  // Check payment status
  checkPaymentStatus: async (checkoutRequestId: string): Promise<{ status: string; transactionId?: string }> => {
    const response = await api.get(`/payments/mpesa/status/${checkoutRequestId}`);
    return response.data;
  },

  // Get user's payment history
  getPaymentHistory: async (): Promise<any[]> => {
    const response = await api.get('/payments/history');
    return response.data;
  },

  // Upgrade to premium
  upgradeToPremium: async (paymentRequest: PaymentRequest): Promise<PaymentResponse> => {
    const response = await api.post('/payments/premium', paymentRequest);
    return response.data;
  },
};

export const chatApi = {
  // Get conversations
  getConversations: async (): Promise<any[]> => {
    const response = await api.get('/chat/conversations');
    return response.data;
  },

  // Get messages for a conversation
  getMessages: async (conversationId: string): Promise<any[]> => {
    const response = await api.get(`/chat/conversations/${conversationId}/messages`);
    return response.data;
  },

  // Send a message
  sendMessage: async (conversationId: string, content: string, type: string = 'text'): Promise<any> => {
    const response = await api.post(`/chat/conversations/${conversationId}/messages`, {
      content,
      type,
    });
    return response.data;
  },

  // Mark messages as read
  markAsRead: async (conversationId: string): Promise<{ message: string }> => {
    const response = await api.put(`/chat/conversations/${conversationId}/read`);
    return response.data;
  },

  // Delete a message
  deleteMessage: async (messageId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/chat/messages/${messageId}`);
    return response.data;
  },
};