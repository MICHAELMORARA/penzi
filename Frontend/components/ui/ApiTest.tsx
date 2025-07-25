'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

const ApiTest: React.FC = () => {
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    data?: any;
  }>({ status: 'idle', message: '' });

  const testApiConnection = async () => {
    setTestResult({ status: 'loading', message: 'Testing API connection...' });
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/test`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setTestResult({
          status: 'success',
          message: 'API connection successful!',
          data: data.data
        });
      } else {
        setTestResult({
          status: 'error',
          message: data.message || 'API test failed'
        });
      }
    } catch (error) {
      setTestResult({
        status: 'error',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const getStatusIcon = () => {
    switch (testResult.status) {
      case 'loading':
        return <Loader className="h-5 w-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (testResult.status) {
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'loading':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">API Connection Test</h3>
        <button
          onClick={testApiConnection}
          disabled={testResult.status === 'loading'}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testResult.status === 'loading' ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {testResult.status !== 'idle' && (
        <div className={`p-3 rounded-md border ${getStatusColor()}`}>
          <div className="flex items-center">
            {getStatusIcon()}
            <span className="ml-2 text-sm font-medium">{testResult.message}</span>
          </div>
          
          {testResult.data && (
            <div className="mt-2 text-xs">
              <pre className="bg-white p-2 rounded border overflow-x-auto">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>API URL: {process.env.NEXT_PUBLIC_API_URL || 'Not configured'}</p>
        <p>This test verifies the frontend can communicate with the backend API.</p>
      </div>
    </div>
  );
};

export default ApiTest;