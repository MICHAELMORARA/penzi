'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Heart,
  MessageSquare,
  Eye,
  MessageCircle,
  Bell,
  Menu,
  X,
  Settings,
} from 'lucide-react';

import OverviewTab from '@/components/dashboard/OverviewTab';
import UsersTab from '@/components/dashboard/userTab';
import MatchesTab from '@/components/dashboard/matchesTab';
import MessagesTab from '@/components/dashboard/messagesTab';
import InterestsTab from '@/components/dashboard/interestsTab';
import ChatTab from '@/components/dashboard/chatTab';
import NotificationsTab from '@/components/dashboard/notificationsTab';
import SettingsTab from '@/components/dashboard/settingsTab';
import NotificationBell from '@/components/ui/NotificationBell';
import { useAppContext, actions } from '@/lib/context/AppContext';
import { useUserApi, useDashboardApi } from '@/lib/hooks/useApi';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';

type TabType = 'overview' | 'users' | 'matches' | 'messages' | 'interests' | 'chat' | 'notifications' | 'settings';

interface Tab {
  id: TabType;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

const Dashboard: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { getUserStats } = useUserApi();
  const { getAnalytics } = useDashboardApi();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load user stats and dashboard analytics
        await Promise.all([
          getUserStats(),
          getAnalytics()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, [getUserStats, getAnalytics]);

  // Simulate notification updates (in a real app, this would come from WebSocket or polling)
  useEffect(() => {
    const checkForNewNotifications = () => {
      // This would typically be replaced with real-time updates from your backend
      // For demonstration, we'll simulate new notifications every 30 seconds
      if (state.activeTab !== 'notifications') {
        // Only increment if not currently viewing notifications
        const shouldAddNotification = Math.random() > 0.7; // 30% chance
        if (shouldAddNotification) {
          dispatch(actions.incrementNotifications());
        }
      }
    };

    const interval = setInterval(checkForNewNotifications, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [state.activeTab, dispatch]);

  const tabs: Tab[] = [
    {
      id: 'overview',
      name: 'Overview',
      icon: BarChart3,
      component: OverviewTab,
    },
    { id: 'users', name: 'Users', icon: Users, component: UsersTab },
    { id: 'matches', name: 'Matches', icon: Heart, component: MatchesTab },
    { id: 'messages', name: 'Messages', icon: MessageSquare, component: MessagesTab },
    { id: 'interests', name: 'Interests', icon: Eye, component: InterestsTab },
    { id: 'chat', name: 'Live Chat', icon: MessageCircle, component: ChatTab },
    { id: 'notifications', name: 'Notifications', icon: Bell, component: NotificationsTab },
    { id: 'settings', name: 'Settings', icon: Settings, component: SettingsTab },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === state.activeTab)?.component || (() => <div />);

  return (
    <div className="flex h-screen bg-neutral-50 flex-col md:flex-row">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-4/5 max-w-xs transform overflow-y-auto bg-white border-r border-neutral-200 shadow-lg transition duration-300 ease-in-out md:relative md:w-72 md:max-w-none md:translate-x-0 ${
          state.sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            {/* Logo/Title */}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl shadow-sm">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-poppins text-neutral-900">
                  Penzi
                </h1>
                <p className="text-xs text-secondary-600">Dating Platform</p>
              </div>
            </div>

            {/* Close Button (Mobile) */}
            <button
              className="md:hidden p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              onClick={() => dispatch(actions.setSidebarOpen(false))}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = state.activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    dispatch(actions.setActiveTab(tab.id));
                    dispatch(actions.setSidebarOpen(false));
                  }}
                  className={`
                    flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group
                    ${isActive
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-sm'
                      : 'text-neutral-700 hover:bg-gradient-to-r hover:from-primary-50 hover:to-secondary-50 hover:text-neutral-900'
                    }
                  `}
                >
                  {/* Special handling for notifications tab */}
                  {tab.id === 'notifications' ? (
                    <div className="mr-3">
                      <NotificationBell 
                        className="h-5 w-5"
                        isActive={isActive}
                      />
                    </div>
                  ) : (
                    <Icon className={`mr-3 h-5 w-5 transition-colors duration-200 ${isActive ? 'text-white' : 'text-neutral-600 group-hover:text-neutral-700'}`} />
                  )}
                  <span className="font-medium font-poppins">{tab.name}</span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="mt-8 pt-6 border-t border-neutral-200">
            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-4 border border-primary-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                  <Heart className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold font-poppins text-neutral-900">Admin Panel</p>
                  <p className="text-xs text-secondary-600">Manage your platform</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Hamburger Button */}
      <button
        className="fixed top-3 left-3 z-40 p-2 bg-white rounded-lg shadow-lg border border-neutral-200 md:hidden hover:shadow-xl transition-all duration-200 backdrop-blur-sm"
        onClick={() => dispatch(actions.setSidebarOpen(true))}
      >
        <Menu className="h-4 w-4 text-neutral-700" />
      </button>

      {/* Overlay for sidebar on mobile */}
      {state.sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden transition-opacity duration-300"
          onClick={() => dispatch(actions.setSidebarOpen(false))}
        />
      )}

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto transition-all duration-300">
        <div className="w-full h-full pt-14 md:pt-0 px-3 sm:px-4 md:px-0">
          {state.error && (
            <div className="p-4 sm:p-6">
              <ErrorMessage 
                message={state.error} 
                onClose={() => dispatch(actions.clearError())}
                className="mb-4"
              />
            </div>
          )}
          <div className="h-full">
            <ActiveComponent />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;