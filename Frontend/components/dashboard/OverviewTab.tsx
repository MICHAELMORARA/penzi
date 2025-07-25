'use client';

import React from 'react';
import {
  Users,
  Heart,
  Eye,
  TrendingUp,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useAppContext, actions } from '@/lib/context/AppContext';
import { useUserApi, useDashboardApi } from '@/lib/hooks/useApi';
import Loading from '@/components/ui/Loading';

// Types 
interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  trend?: number;
  subtitle?: string;
}

// Metric Card Component 
const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, trend, subtitle }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-neutral-600">{title}</p>
          <div className="flex items-center">
            <p className="text-2xl font-semibold text-neutral-900">{value.toLocaleString()}</p>
            {trend !== undefined && (
              <div className={`ml-2 flex items-center text-sm ${
                trend >= 0 ? 'text-secondary-600' : 'text-primary-600'
              }`}>
                {trend >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                )}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Main OverviewTab Component 
const OverviewTab: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { getUserStats } = useUserApi();
  const { getAnalytics } = useDashboardApi();

  // Load data when component mounts
  React.useEffect(() => {
    const loadData = async () => {
      try {
        dispatch(actions.setLoading(true));
        await Promise.all([
          getUserStats(),
          getAnalytics()
        ]);
      } catch (error) {
        console.error('Error loading overview data:', error);
      } finally {
        dispatch(actions.setLoading(false));
      }
    };

    loadData();
  }, [getUserStats, getAnalytics, dispatch]);

  // Handle quick action navigation
  const handleQuickAction = (tabId: string) => {
    dispatch(actions.setActiveTab(tabId as any));
  };

  if (state.loading) {
    return <Loading text="Loading dashboard overview..." />;
  }

  const userStats = state.userStats;
  const analytics = state.dashboardAnalytics;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-8">
        {/* Header */}
        <div className="text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900">
                Dashboard Overview
              </h1>
              <p className="text-neutral-600 mt-2 text-lg">Monitor your platform's performance and activity</p>
            </div>
            <div className="flex items-center space-x-2 bg-white rounded-2xl px-4 py-2 shadow-sm border border-neutral-200">
              <div className="w-3 h-3 bg-secondary-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-neutral-700">Live Data</span>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-6 flex items-center">
            <TrendingUp className="h-6 w-6 mr-2 text-primary-600" />
            Key Metrics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Users"
              value={userStats?.total_users || 0}
              icon={Users}
              color="bg-primary-500"
              subtitle={`${userStats?.registrations_this_month || 0} new this month`}
            />
            <MetricCard
              title="Active Users"
              value={userStats?.active_users || 0}
              icon={UserCheck}
              color="bg-secondary-500"
              subtitle={`${userStats?.completed_registrations || 0} completed profiles`}
            />
            <MetricCard
              title="Total Interests"
              value={analytics?.total_interests || 0}
              icon={Eye}
              color="bg-accent-500"
              subtitle={`${analytics?.positive_responses || 0} positive responses`}
            />
            <MetricCard
              title="Success Rate"
              value={Math.round(analytics?.success_rate || 0)}
              icon={TrendingUp}
              color="bg-gradient-to-r from-primary-500 to-secondary-500"
              subtitle="Interest to match conversion"
            />
          </div>
        </div>

        {/* Additional Metrics */}
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-6 flex items-center">
            <Users className="h-6 w-6 mr-2 text-secondary-600" />
            User Demographics
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MetricCard
              title="Male Users"
              value={userStats?.male_users || 0}
              icon={Users}
              color="bg-primary-500"
              subtitle="Male registrations"
            />
            <MetricCard
              title="Female Users"
              value={userStats?.female_users || 0}
              icon={Users}
              color="bg-secondary-500"
              subtitle="Female registrations"
            />
            <MetricCard
              title="Average Age"
              value={Math.round(userStats?.average_age || 0)}
              icon={UserCheck}
              color="bg-accent-500"
              subtitle="User demographics"
            />
          </div>
        </div>

        {/* Platform Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-neutral-900 mb-6 flex items-center">
            <Heart className="h-6 w-6 mr-2 text-primary-600" />
            Platform Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700">Registration Completion Rate</span>
                <span className="text-lg font-bold text-neutral-900 bg-secondary-100 px-3 py-1 rounded-full">
                  {(userStats?.total_users || 0) > 0 
                    ? Math.round(((userStats?.completed_registrations || 0) / (userStats?.total_users || 1)) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-secondary-500 to-accent-500 h-3 rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${(userStats?.total_users || 0) > 0 
                      ? ((userStats?.completed_registrations || 0) / (userStats?.total_users || 1)) * 100 
                      : 0}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-neutral-600">Users who completed their profiles</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700">Interest Success Rate</span>
                <span className="text-lg font-bold text-neutral-900 bg-primary-100 px-3 py-1 rounded-full">
                  {Math.round(analytics?.success_rate || 0)}%
                </span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-primary-500 to-secondary-500 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${analytics?.success_rate || 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-neutral-600">Interests that lead to matches</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-neutral-900 mb-6 flex items-center">
            <Eye className="h-6 w-6 mr-2 text-accent-600" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={() => handleQuickAction('users')}
              className="group p-6 bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-200 rounded-2xl hover:bg-gradient-to-br hover:from-primary-100 hover:to-secondary-100 hover:shadow-md text-left transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <Users className="h-6 w-6 text-primary-500 group-hover:text-primary-600 transition-colors" />
                <ArrowUpRight className="h-4 w-4 text-neutral-600 group-hover:text-primary-500 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-neutral-900 mb-1">Manage Users</p>
              <p className="text-xs text-neutral-600 leading-relaxed">View and manage user accounts</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('chat')}
              className="group p-6 bg-gradient-to-br from-secondary-50 to-accent-50 border border-secondary-200 rounded-2xl hover:bg-gradient-to-br hover:from-secondary-100 hover:to-accent-100 hover:shadow-md text-left transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <Heart className="h-6 w-6 text-secondary-500 group-hover:text-secondary-600 transition-colors" />
                <ArrowUpRight className="h-4 w-4 text-neutral-600 group-hover:text-secondary-500 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-neutral-900 mb-1">Live Chat</p>
              <p className="text-xs text-neutral-600 leading-relaxed">Start conversations with users</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('interests')}
              className="group p-6 bg-gradient-to-br from-accent-50 to-primary-50 border border-accent-200 rounded-2xl hover:bg-gradient-to-br hover:from-accent-100 hover:to-primary-100 hover:shadow-md text-left transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <Eye className="h-6 w-6 text-accent-500 group-hover:text-accent-600 transition-colors" />
                <ArrowUpRight className="h-4 w-4 text-neutral-600 group-hover:text-accent-500 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-neutral-900 mb-1">View Interests</p>
              <p className="text-xs text-neutral-600 leading-relaxed">Monitor interest expressions</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('notifications')}
              className="group p-6 bg-gradient-to-br from-primary-50 to-accent-50 border border-primary-200 rounded-2xl hover:bg-gradient-to-br hover:from-primary-100 hover:to-accent-100 hover:shadow-md text-left transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="h-6 w-6 text-primary-500 group-hover:text-primary-600 transition-colors" />
                <ArrowUpRight className="h-4 w-4 text-neutral-600 group-hover:text-primary-500 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-neutral-900 mb-1">Notifications</p>
              <p className="text-xs text-neutral-600 leading-relaxed">View platform notifications</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;