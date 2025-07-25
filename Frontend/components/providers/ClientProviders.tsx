'use client';

import React from 'react';
import { AuthProvider } from '@/lib/context/AuthContext';
import { ToastProvider } from '@/lib/context/ToastContext';
import { NotificationProvider, NotificationContainer } from '@/components/ui/Notification';
import Navigation from '@/components/ui/Navigation';
import { Toaster } from 'react-hot-toast';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ToastProvider>
      <AuthProvider>
        <NotificationProvider>
          <Navigation />
          <div className="pb-16 md:pb-0">
            {children}
          </div>
          <NotificationContainer />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}