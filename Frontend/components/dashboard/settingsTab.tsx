'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, DollarSign, Smartphone, Globe, Shield, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminSettings {
  chatFee: number;
  premiumFee: number;
  maxSwipesPerDay: number;
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  maintenanceMode: boolean;
  appName: string;
  supportEmail: string;
}

const SettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings>({
    chatFee: 50,
    premiumFee: 500,
    maxSwipesPerDay: 10,
    enableEmailNotifications: true,
    enableSmsNotifications: true,
    maintenanceMode: false,
    appName: 'Penzi',
    supportEmail: 'support@penzi.com'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (key: keyof AdminSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast.success('Settings saved successfully!');
        setHasChanges(false);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
            <p className="text-gray-600">Configure your dating platform</p>
          </div>
        </div>
        
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Payment Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chat Fee (KSh)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={settings.chatFee}
                onChange={(e) => handleInputChange('chatFee', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Amount users pay to start chatting with someone they like
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Premium Subscription Fee (KSh)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={settings.premiumFee}
                onChange={(e) => handleInputChange('premiumFee', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Monthly premium subscription fee for unlimited features
              </p>
            </div>
          </div>
        </div>

        {/* App Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Smartphone className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">App Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Swipes Per Day (Free Users)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.maxSwipesPerDay}
                onChange={(e) => handleInputChange('maxSwipesPerDay', parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="10"
              />
              <p className="text-xs text-gray-500 mt-1">
                Daily swipe limit for non-premium users
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Name
              </label>
              <input
                type="text"
                value={settings.appName}
                onChange={(e) => handleInputChange('appName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Penzi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Support Email
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="support@penzi.com"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Globe className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Email Notifications
                </label>
                <p className="text-xs text-gray-500">
                  Send email notifications to users
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableEmailNotifications}
                  onChange={(e) => handleInputChange('enableEmailNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  SMS Notifications
                </label>
                <p className="text-xs text-gray-500">
                  Send SMS notifications to users
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableSmsNotifications}
                  onChange={(e) => handleInputChange('enableSmsNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">System Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Maintenance Mode
                </label>
                <p className="text-xs text-gray-500">
                  Temporarily disable the app for maintenance
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            {settings.maintenanceMode && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-700 font-medium">
                    Maintenance mode is enabled
                  </p>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Users will see a maintenance message when trying to access the app
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Settings Summary */}
      <div className="mt-8 bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Settings Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Chat Fee</p>
            <p className="font-semibold text-primary-600">KSh {settings.chatFee}</p>
          </div>
          <div>
            <p className="text-gray-600">Premium Fee</p>
            <p className="font-semibold text-primary-600">KSh {settings.premiumFee}</p>
          </div>
          <div>
            <p className="text-gray-600">Daily Swipes</p>
            <p className="font-semibold text-primary-600">{settings.maxSwipesPerDay}</p>
          </div>
          <div>
            <p className="text-gray-600">Status</p>
            <p className={`font-semibold ${settings.maintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
              {settings.maintenanceMode ? 'Maintenance' : 'Active'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;