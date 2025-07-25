'use client';

import React, { useState, useEffect } from 'react';
import { Settings, DollarSign, Smartphone, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminSetting {
  id: number;
  settingKey: string;
  settingValue: any;
  settingType: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MpesaSettings {
  shortcode: string;
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  callbackUrl: string;
  environment: string;
}

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [chatFee, setChatFee] = useState<number>(50);
  const [mpesaSettings, setMpesaSettings] = useState<MpesaSettings>({
    shortcode: '',
    consumerKey: '',
    consumerSecret: '',
    passkey: '',
    callbackUrl: '',
    environment: 'sandbox'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'mpesa'>('general');

  useEffect(() => {
    fetchSettings();
    fetchChatFee();
    fetchMpesaSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        toast.error('Failed to fetch settings');
      }
    } catch (error) {
      toast.error('Error fetching settings');
    }
  };

  const fetchChatFee = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/settings/chat-fee', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChatFee(data.chatFee);
      }
    } catch (error) {
      console.error('Error fetching chat fee:', error);
    }
  };

  const fetchMpesaSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/settings/mpesa', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMpesaSettings(data);
      }
    } catch (error) {
      console.error('Error fetching M-Pesa settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateChatFee = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/settings/chat-fee', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ chatFee })
      });

      if (response.ok) {
        toast.success('Chat fee updated successfully');
        fetchSettings(); // Refresh settings list
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update chat fee');
      }
    } catch (error) {
      toast.error('Error updating chat fee');
    } finally {
      setIsSaving(false);
    }
  };

  const updateMpesaSettings = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/settings/mpesa', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mpesaSettings)
      });

      if (response.ok) {
        toast.success('M-Pesa settings updated successfully');
        fetchSettings(); // Refresh settings list
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update M-Pesa settings');
      }
    } catch (error) {
      toast.error('Error updating M-Pesa settings');
    } finally {
      setIsSaving(false);
    }
  };

  const initializeDefaultSettings = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/settings/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Default settings initialized successfully');
        fetchSettings();
        fetchChatFee();
        fetchMpesaSettings();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to initialize settings');
      }
    } catch (error) {
      toast.error('Error initializing settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="w-8 h-8 text-primary-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
                <p className="text-gray-600">Manage application configuration and payment settings</p>
              </div>
            </div>
            <button
              onClick={initializeDefaultSettings}
              disabled={isSaving}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>Initialize Defaults</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'general'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DollarSign className="w-4 h-4 inline mr-2" />
              General Settings
            </button>
            <button
              onClick={() => setActiveTab('mpesa')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'mpesa'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Smartphone className="w-4 h-4 inline mr-2" />
              M-Pesa Settings
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Chat Fee Setting */}
              <div className="bg-primary-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Chat Fee</h3>
                    <p className="text-gray-600">Amount users pay to express interest in a match</p>
                  </div>
                  <DollarSign className="w-6 h-6 text-primary-500" />
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fee Amount (KES)
                    </label>
                    <input
                      type="number"
                      value={chatFee}
                      onChange={(e) => setChatFee(Number(e.target.value))}
                      min="0"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={updateChatFee}
                    disabled={isSaving}
                    className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
                    <span>Update</span>
                  </button>
                </div>
              </div>

              {/* All Settings List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">All Settings</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    {settings.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                        <p>No settings found. Click "Initialize Defaults" to create default settings.</p>
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Setting
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Value
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {settings.map((setting) => (
                            <tr key={setting.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {setting.settingKey}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {setting.description}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {setting.settingType === 'boolean' 
                                    ? (setting.settingValue ? 'Yes' : 'No')
                                    : String(setting.settingValue)
                                  }
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {setting.settingType}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {setting.isActive ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Inactive
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mpesa' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">M-Pesa Configuration</h3>
                    <p className="text-gray-600">Configure M-Pesa payment gateway settings</p>
                  </div>
                  <Smartphone className="w-6 h-6 text-blue-500" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Shortcode
                    </label>
                    <input
                      type="text"
                      value={mpesaSettings.shortcode}
                      onChange={(e) => setMpesaSettings(prev => ({ ...prev, shortcode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="174379"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Environment
                    </label>
                    <select
                      value={mpesaSettings.environment}
                      onChange={(e) => setMpesaSettings(prev => ({ ...prev, environment: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="sandbox">Sandbox</option>
                      <option value="production">Production</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consumer Key
                    </label>
                    <input
                      type="text"
                      value={mpesaSettings.consumerKey}
                      onChange={(e) => setMpesaSettings(prev => ({ ...prev, consumerKey: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your M-Pesa consumer key"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consumer Secret
                    </label>
                    <input
                      type="password"
                      value={mpesaSettings.consumerSecret}
                      onChange={(e) => setMpesaSettings(prev => ({ ...prev, consumerSecret: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your M-Pesa consumer secret"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Passkey
                    </label>
                    <input
                      type="password"
                      value={mpesaSettings.passkey}
                      onChange={(e) => setMpesaSettings(prev => ({ ...prev, passkey: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your M-Pesa passkey"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Callback URL
                    </label>
                    <input
                      type="url"
                      value={mpesaSettings.callbackUrl}
                      onChange={(e) => setMpesaSettings(prev => ({ ...prev, callbackUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://your-domain.com/api/matching/payment/callback"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={updateMpesaSettings}
                    disabled={isSaving}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
                    <span>Update M-Pesa Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;