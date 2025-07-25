'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Phone, CheckCircle, XCircle, Loader } from 'lucide-react';
import { User } from '@/lib/types/auth';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: User;
  onPaymentSuccess: () => void;
  amount?: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onPaymentSuccess,
  amount = 50
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [transactionId, setTransactionId] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setPaymentStatus('idle');
      setErrorMessage('');
      setTransactionId('');
      setCheckoutRequestId('');
    }
  }, [isOpen]);

  const formatPhoneNumber = (phone: string) => {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Format for Kenyan numbers
    if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.length === 9) {
      return '254' + cleaned;
    }
    
    return cleaned;
  };

  const initiatePayment = async () => {
    if (!phoneNumber.trim()) {
      setErrorMessage('Please enter your phone number');
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      const token = localStorage.getItem('token');
      const formattedPhone = formatPhoneNumber(phoneNumber);

      const response = await fetch('/api/matching/payment/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          phoneNumber: formattedPhone,
          amount: amount
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setTransactionId(result.transactionId);
        setCheckoutRequestId(result.checkoutRequestId);
        
        // Start polling for payment status
        pollPaymentStatus(result.transactionId);
      } else {
        setPaymentStatus('failed');
        setErrorMessage(result.message || 'Payment initiation failed');
      }
    } catch (error) {
      setPaymentStatus('failed');
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async (txnId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // Poll for 5 minutes (30 * 10 seconds)

    const poll = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/matching/payment/verify', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transactionId: txnId,
            targetUserId: targetUser.id
          })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setPaymentStatus('success');
          setTimeout(() => {
            onPaymentSuccess();
            onClose();
          }, 2000);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          setPaymentStatus('failed');
          setErrorMessage('Payment verification timeout. Please contact support.');
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000);
        } else {
          setPaymentStatus('failed');
          setErrorMessage('Payment verification failed. Please contact support.');
        }
      }
    };

    poll();
  };

  const handleManualVerification = async () => {
    if (!transactionId) return;

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/matching/payment/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionId: transactionId,
          targetUserId: targetUser.id
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPaymentStatus('success');
        setTimeout(() => {
          onPaymentSuccess();
          onClose();
        }, 2000);
      } else {
        setErrorMessage(result.message || 'Payment verification failed');
      }
    } catch (error) {
      setErrorMessage('Verification failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <CreditCard className="h-12 w-12 text-primary-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Connect with {targetUser.firstName}</h3>
          <p className="text-gray-600">
            Pay to unlock messaging and express your interest
          </p>
        </div>

        {/* Payment Status */}
        {paymentStatus === 'idle' && (
          <div className="space-y-6">
            {/* Amount */}
            <div className="bg-primary-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Connection Fee</span>
                <span className="text-2xl font-bold text-primary-600">KES {amount}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                One-time payment to start chatting with {targetUser.firstName}
              </p>
            </div>

            {/* Phone Number Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline h-4 w-4 mr-2" />
                M-Pesa Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0712345678"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the phone number registered with M-Pesa
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errorMessage}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={initiatePayment}
                disabled={isProcessing || !phoneNumber.trim()}
                className="flex-1 bg-primary-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : `Pay KES ${amount}`}
              </button>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {paymentStatus === 'processing' && (
          <div className="text-center space-y-6">
            <Loader className="h-16 w-16 text-primary-500 mx-auto animate-spin" />
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Processing Payment</h4>
              <p className="text-gray-600 mb-4">
                Please check your phone for the M-Pesa prompt and enter your PIN to complete the payment.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm">
                  <strong>Transaction ID:</strong> {transactionId}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleManualVerification}
                disabled={isProcessing}
                className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Verifying...' : 'I have completed payment'}
              </button>
              <button
                onClick={onClose}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Success Status */}
        {paymentStatus === 'success' && (
          <div className="text-center space-y-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful!</h4>
              <p className="text-gray-600">
                You can now chat with {targetUser.firstName}. Your connection has been established!
              </p>
            </div>
          </div>
        )}

        {/* Failed Status */}
        {paymentStatus === 'failed' && (
          <div className="text-center space-y-6">
            <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Payment Failed</h4>
              <p className="text-gray-600 mb-4">{errorMessage}</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setPaymentStatus('idle');
                  setErrorMessage('');
                }}
                className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;