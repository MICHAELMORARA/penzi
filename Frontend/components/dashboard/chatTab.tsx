'use client';

import React, { useEffect, useState } from 'react';
import { MessageCircle, Send, User, BadgeCheck, Plus, Smartphone, Wifi, WifiOff, X, RefreshCw, Trash2, MoreVertical, Reply, Copy } from 'lucide-react';
import Loading from '@/components/ui/Loading';
import LiveTime from '@/components/ui/LiveTime';
import { useCurrentTime } from '@/lib/hooks/useCurrentTime';

const ChatTab: React.FC = () => {
  const [userName, setUserName] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [conversation, setConversation] = useState<any>(null);
  const [registeredUsername, setRegisteredUsername] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [dialogName, setDialogName] = useState('');
  const [dialogPhone, setDialogPhone] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const { currentTime, formatRelativeTime } = useCurrentTime({ updateInterval: 1000 });
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const lastSendTime = React.useRef<number>(0);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation?.messages, isTyping]);

  // Online status check
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load saved data and conversation
  useEffect(() => {
    const savedPhone = localStorage.getItem('penzi_userPhone');
    const savedName = localStorage.getItem('penzi_userName');
    if (savedPhone) setUserPhone(savedPhone);
    if (savedName) setUserName(savedName);
  }, []);

  useEffect(() => {
    if (userPhone) {
      localStorage.setItem('penzi_userPhone', userPhone);
      loadConversation();
    }
  }, [userPhone]);

  useEffect(() => {
    if (userName) {
      localStorage.setItem('penzi_userName', userName);
    }
  }, [userName]);

  const normalizePhone = (phone: string) => {
    if (!phone) return '';
    let p = phone.trim();
    if (p.startsWith('+')) p = p.slice(1);
    if (p.startsWith('0') && p.length === 10) {
      p = '254' + p.slice(1);
    }
    if (p.length === 9 && !p.startsWith('254')) {
      p = '254' + p;
    }
    return p;
  };

  const loadConversation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sms/conversations`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const normUserPhone = normalizePhone(userPhone);
        
        if (data.data.conversations && Array.isArray(data.data.conversations)) {
          let conv = data.data.conversations.find((c: any) => {
            const convPhone = normalizePhone(c.phone_number);
            return convPhone === normUserPhone;
          });
          
          if (!conv) {
            conv = data.data.conversations.find((c: any) => {
              return c.phone_number === userPhone;
            });
          }
          
          if (!conv) {
            conv = data.data.conversations.find((c: any) => {
              return c.phone_number === normUserPhone || 
                     normalizePhone(c.phone_number) === userPhone ||
                     c.phone_number.includes(userPhone.slice(-9)) ||
                     userPhone.includes(c.phone_number.slice(-9));
            });
          }
          
          if (conv) {
            setConversation(conv);
            if (conv.user_name && conv.user_name !== 'Unknown User' && conv.user_name !== '22141') {
              setRegisteredUsername(conv.user_name);
            } else if (conv.messages && conv.messages.length > 0) {
              const userMsg = conv.messages.find((msg: any) => {
                const msgPhone = normalizePhone(msg.from_phone);
                return msgPhone === normUserPhone && 
                       msg.user_name && 
                       msg.user_name !== 'Unknown User' && 
                       msg.user_name !== '22141' &&
                       msg.user_name.trim() !== '';
              });
              if (userMsg && userMsg.user_name) {
                setRegisteredUsername(userMsg.user_name);
              }
            }
          } else {
            setConversation({
              phone_number: normUserPhone,
              user_name: userName,
              messages: []
            });
          }
        } else {
          setConversation({
            phone_number: normalizePhone(userPhone),
            user_name: userName,
            messages: []
          });
        }
      } else {
        setConversation({
          phone_number: normalizePhone(userPhone),
          user_name: userName,
          messages: []
        });
      }
    } catch (error) {
      setConversation({
        phone_number: normalizePhone(userPhone),
        user_name: userName,
        messages: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const from_phone = userPhone;
    const message_body = newMessage.trim();
    
    if (!process.env.NEXT_PUBLIC_API_URL) {
      alert('API URL not configured. Please check environment variables.');
      return;
    }
    
    if (!from_phone || !message_body || sending) {
      return;
    }
    
    // Prevent rapid successive sends
    const now = Date.now();
    if (now - lastSendTime.current < 2000) {
      return;
    }
    lastSendTime.current = now;
    
    setNewMessage('');
    setSending(true);
    setIsTyping(true);
    
    const currentMessageCount = conversation?.messages?.length || 0;
    
    const timeoutId = setTimeout(() => {
      setSending(false);
      setIsTyping(false);
    }, 25000);
    
    try {
      const controller = new AbortController();
      const timeoutSignal = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sms/process-incoming`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_phone,
          to_phone: '22141',
          message_body,
          direction: 'incoming'
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutSignal);
      
      if (!response.ok) {
        let errorText;
        try {
          const err = await response.json();
          errorText = err;
        } catch (parseError) {
          errorText = await response.text();
        }
        
        clearTimeout(timeoutId);
        setSending(false);
        setIsTyping(false);
        
        alert(`Failed to send message: ${response.status} - ${JSON.stringify(errorText)}`);
        return;
      }
      
      const responseData = await response.json();
      
      // Add user's message to conversation
      const userMessage = {
        id: Date.now(),
        from_phone: from_phone,
        to_phone: '22141',
        message_body: replyingTo ? `@${replyingTo.user_name || 'System'}: ${message_body}` : message_body,
        direction: 'incoming',
        timestamp: new Date().toISOString(),
        user_name: userName,
        reply_to: replyingTo ? replyingTo.id : null
      };
      
      if (replyingTo) {
        setReplyingTo(null);
      }
      
      let updatedConversation;
      if (conversation && conversation.messages) {
        updatedConversation = {
          ...conversation,
          messages: [...conversation.messages, userMessage]
        };
      } else {
        updatedConversation = {
          phone_number: normalizePhone(from_phone),
          user_name: userName,
          messages: [userMessage],
          last_message: message_body,
          last_message_time: new Date().toISOString(),
          message_count: 1
        };
      }
      
      setConversation(updatedConversation);
      
      // Poll for system response
      let attempts = 0;
      let foundNewMessages = false;
      const normUserPhone = normalizePhone(userPhone);
      const maxAttempts = 20;
      const currentMessageCountForPolling = updatedConversation.messages.length;
      
      while (attempts < maxAttempts && !foundNewMessages) {
        if (attempts > 0) {
          await new Promise(res => setTimeout(res, 1000));
        } else {
          await new Promise(res => setTimeout(res, 500));
        }
        
        try {
          const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sms/conversations`);
          
          if (!resp.ok) {
            attempts++;
            continue;
          }
          
          const data = await resp.json();
          
          if (data.success && data.data && data.data.conversations && Array.isArray(data.data.conversations)) {
            let conv = null;
            
            conv = data.data.conversations.find((c: any) => {
              const convPhone = normalizePhone(c.phone_number);
              return convPhone === normUserPhone;
            });
            
            if (!conv) {
              conv = data.data.conversations.find((c: any) => {
                return c.phone_number === userPhone ||
                       c.phone_number === normUserPhone ||
                       normalizePhone(c.phone_number) === userPhone ||
                       c.phone_number.includes(userPhone.slice(-9)) ||
                       userPhone.includes(c.phone_number.slice(-9));
              });
            }
            
            if (conv) {
              const convMessageCount = conv.messages?.length || 0;
              
              if (convMessageCount > currentMessageCountForPolling) {
                setConversation(conv);
                foundNewMessages = true;
                break;
              }
            }
          }
        } catch (pollError) {
          // Continue polling on error
        }
        
        attempts++;
      }
      
      // Try to reload conversation after polling
      try {
        await loadConversation();
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (loadError) {
        // Continue silently
      }
      
      clearTimeout(timeoutId);
      
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('Network error: Cannot connect to backend server.');
      } else if (error instanceof Error && error.name === 'AbortError') {
        alert('Request timed out. Please try again.');
      } else if (error instanceof Error) {
        alert(`Error: ${error.message}`);
      } else {
        alert('An unknown error occurred. Please try again.');
      }
      
      clearTimeout(timeoutId);
    } finally {
      setSending(false);
      setIsTyping(false);
      
      // Reload conversation after delay
      setTimeout(async () => {
        try {
          await loadConversation();
        } catch (error) {
          // Silent fail
        }
      }, 2000);
    }
  };

  const handleStartConversation = () => {
    setShowStartDialog(true);
  };

  const handleDialogSubmit = async () => {
    if (!dialogName.trim() || !dialogPhone.trim()) return;
    
    const normalizedPhone = normalizePhone(dialogPhone);
    setShowStartDialog(false);
    setSending(true);
    
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sms/process-incoming`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_phone: normalizedPhone,
          to_phone: '22141',
          message_body: 'PENZI',
          direction: 'incoming'
        })
      });
      
      // Wait for conversation to be created
      let found = false;
      let conv = null;
      let attempts = 0;
      
      while (attempts < 10 && !found) {
        await new Promise(res => setTimeout(res, 700));
        const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sms/conversations`);
        const data = await resp.json();
        const normPhone = normalizePhone(normalizedPhone);
        
        if (data.success && data.data && data.data.conversations) {
          conv = data.data.conversations.find((c: any) => {
            return c.phone_number === normPhone ||
                   c.phone_number === normalizedPhone ||
                   normalizePhone(c.phone_number) === normPhone ||
                   c.phone_number.includes(normPhone.slice(-9)) ||
                   normPhone.includes(c.phone_number.slice(-9));
          });
          if (conv) found = true;
        }
        attempts++;
      }
      
      setUserName(dialogName);
      setUserPhone(normalizedPhone);
      
      if (conv) {
        setConversation(conv);
      } else {
        setConversation({
          phone_number: normalizedPhone,
          user_name: dialogName,
          messages: []
        });
      }
      
      setDialogName('');
      setDialogPhone('');
      
    } catch (error) {
      // Handle error silently
    } finally {
      setSending(false);
    }
  };

  const handleDialogCancel = () => {
    setShowStartDialog(false);
    setDialogName('');
    setDialogPhone('');
  };

  const handleRefreshConversation = async () => {
    setLoading(true);
    try {
      await loadConversation();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!conversation || !messageId) return;
    
    setDeletingMessageId(messageId);
    
    try {
      // Call backend API to delete the message
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sms/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Remove message from local state
        const updatedMessages = conversation.messages.filter((msg: any) => msg.id !== messageId);
        setConversation({
          ...conversation,
          messages: updatedMessages,
          message_count: updatedMessages.length
        });
      } else {
        alert('Failed to delete message. Please try again.');
      }
    } catch (error) {
      alert('Error deleting message. Please try again.');
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleClearAllMessages = async () => {
    if (!conversation || !userPhone) return;
    
    setLoading(true);
    
    try {
      // Call backend API to clear all messages for conversation
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sms/conversations/${encodeURIComponent(userPhone)}/clear`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Clear messages from local state
        setConversation({
          ...conversation,
          messages: [],
          message_count: 0,
          last_message: '',
          last_message_time: null
        });
        setShowClearAllDialog(false);
      } else {
        alert('Failed to clear messages. Please try again.');
      }
    } catch (error) {
      alert('Error clearing messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = async (message: any) => {
    try {
      await navigator.clipboard.writeText(message.message_body);
      setActiveMessageMenu(null);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = message.message_body;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setActiveMessageMenu(null);
    }
  };

  const handleReplyToMessage = (message: any) => {
    setReplyingTo(message);
    setActiveMessageMenu(null);
    // Focus on the input field
    const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (inputElement) {
      inputElement.focus();
    }
  };

  const handleDeleteFromMenu = (messageId: number) => {
    setActiveMessageMenu(null);
    handleDeleteMessage(messageId);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMessageMenu !== null) {
        const target = event.target as Element;
        if (!target.closest('.message-menu')) {
          setActiveMessageMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMessageMenu]);

  // Typing indicator component
  const TypingIndicator = () => (
    <div className="flex justify-start mb-4">
      <div className="max-w-[80vw] sm:max-w-[60vw] md:max-w-md px-4 py-3 rounded-2xl shadow-md bg-gray-100 text-gray-900 rounded-bl-none ml-2 border border-blue-100">
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-xs text-gray-500 ml-2">System is typing...</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50 to-pink-50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl shadow-lg">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-poppins bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Live SMS Chat
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">Connect and chat with the Penzi system</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Connection Status */}
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            
            <button
              onClick={handleStartConversation}
              disabled={sending}
              className="flex items-center space-x-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none font-medium font-poppins"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Start Conversation</span>
              <span className="sm:hidden">Start</span>
            </button>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 overflow-hidden h-[80vh] flex flex-col">
        {userPhone && conversation ? (
          <div className="flex-1 flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200/50 flex items-center justify-between bg-gradient-to-r from-rose-50/80 to-pink-50/80 backdrop-blur-sm">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="relative">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                    <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-poppins text-gray-900 flex items-center gap-2">
                    {registeredUsername || userName || 'Username'}
                    <span title="Verified User">
                      <BadgeCheck className="h-4 w-4 sm:h-5 sm:w-5 text-rose-500" />
                    </span>
                  </h3>
                  <div className="flex items-center text-xs sm:text-sm text-gray-500">
                    <Smartphone className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="font-mono">{userPhone}</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex items-center space-x-2">
                {conversation && conversation.messages && conversation.messages.length > 0 && (
                  <button
                    onClick={() => setShowClearAllDialog(true)}
                    disabled={loading}
                    className="p-2 text-red-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Clear all messages"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={handleRefreshConversation}
                  disabled={loading}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                  title="Refresh conversation"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button><div>
                  <div className="text-xs sm:text-sm text-rose-600 font-semibold font-poppins">
                    Penzi System
                  </div>
                  <div className="text-xs text-gray-500 font-mono">22141</div>
                </div>
              </div>
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 bg-gradient-to-br from-white/50 to-rose-50/30 backdrop-blur-sm">
              {conversation.messages.length === 0 && (
                <div className="flex justify-center items-center h-full">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <MessageCircle className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold font-poppins text-gray-900 mb-2">Welcome to Penzi!</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Start your journey by typing <span className="font-bold bg-rose-100 px-2 py-1 rounded text-rose-700">PENZI</span> to begin registration and find your perfect match.
                    </p>
                  </div>
                </div>
              )}
              
              {conversation.messages.map((message: any, idx: number) => {
                const normMessagePhone = normalizePhone(message.from_phone);
                const normUserPhone = normalizePhone(userPhone);
                const isUser = normMessagePhone === normUserPhone || message.from_phone === userPhone;
                return (
                  <div
                    key={message.id || idx}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in mb-2 w-full`}
                  >
                    <div className="relative message-menu max-w-[85%] sm:max-w-[70%] md:max-w-md">
                      {/* Message bubble */}
                      <div
                        onClick={() => setActiveMessageMenu(activeMessageMenu === message.id ? null : message.id)}
                        className={`
                          w-full px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl cursor-pointer relative break-words
                          ${isUser 
                            ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-br-md' 
                            : 'bg-white/90 text-gray-900 rounded-bl-md border border-gray-200/50'
                          }
                        `}
                        style={{ 
                          wordWrap: 'break-word', 
                          overflowWrap: 'break-word',
                          wordBreak: 'break-word',
                          hyphens: 'auto'
                        }}
                      >
                        {/* Reply indicator */}
                        {message.reply_to && (
                          <div className={`text-xs mb-2 p-2 rounded ${isUser ? 'bg-rose-400/30' : 'bg-gray-100'} border-l-2 ${isUser ? 'border-rose-200' : 'border-gray-400'}`}>
                            <div className={`font-medium ${isUser ? 'text-rose-100' : 'text-gray-600'} mb-1`}>
                              Replying to {message.reply_to.user_name || 'System'}
                            </div>
                            <div className={`${isUser ? 'text-rose-100' : 'text-gray-500'} break-words whitespace-pre-wrap leading-tight max-h-12 overflow-hidden`}>
                              {message.reply_to.message_body?.length > 80 
                                ? message.reply_to.message_body.substring(0, 80) + '...'
                                : message.reply_to.message_body
                              }
                            </div>
                          </div>
                        )}
                        
                        <p className="text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed word-break overflow-wrap-anywhere">
                          {message.message_body}
                        </p>
                        <div className={`flex items-center justify-between mt-2 ${isUser ? 'text-rose-100' : 'text-gray-500'}`}>
                          <span className="text-xs font-medium">
                            {formatRelativeTime(message.timestamp)}
                          </span>
                          <MoreVertical className="h-3 w-3 opacity-50" />
                        </div>
                      </div>

                      {/* WhatsApp-style dropdown menu */}
                      {activeMessageMenu === message.id && (
                        <div className={`absolute top-0 ${isUser ? 'right-full mr-2' : 'left-full ml-2'} bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10 min-w-[120px]`}>
                          <button
                            onClick={() => handleReplyToMessage(message)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <Reply className="h-4 w-4" />
                            <span>Reply</span>
                          </button>
                          <button
                            onClick={() => handleCopyMessage(message)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <Copy className="h-4 w-4" />
                            <span>Copy</span>
                          </button>
                          <button
                            onClick={() => handleDeleteFromMenu(message.id)}
                            disabled={deletingMessageId === message.id}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 disabled:opacity-50"
                          >
                            {deletingMessageId === message.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border border-red-600 border-t-transparent"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Typing Indicator */}
              {isTyping && <TypingIndicator />}
              
              {/* System Response Pending Indicator */}
              {!isTyping && conversation && conversation.messages && conversation.messages.length > 0 && (
                (() => {
                  const lastMessage = conversation.messages[conversation.messages.length - 1];
                  const isLastMessageFromUser = normalizePhone(lastMessage.from_phone) === normalizePhone(userPhone);
                  const isRecentMessage = new Date().getTime() - new Date(lastMessage.timestamp).getTime() < 30000; // 30 seconds
                  
                  return isLastMessageFromUser && isRecentMessage && (
                    <div className="flex justify-start mb-4">
                      <div className="max-w-[80vw] sm:max-w-[60vw] md:max-w-md px-4 py-2 rounded-2xl shadow-sm bg-yellow-50 text-yellow-700 rounded-bl-none ml-2 border border-yellow-200">
                        <div className="flex items-center space-x-2 text-xs">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                          <span>System is processing your message...</span>
                          <button
                            onClick={handleRefreshConversation}
                            className="text-yellow-600 hover:text-yellow-800 underline ml-2"
                          >
                            Check now
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
              
              <div ref={messagesEndRef} />
            </div>
            {/* Message Input */}
            <div className="p-4 sm:p-6 border-t border-gray-200/50 bg-white/80 backdrop-blur-sm">
              {/* Reply Preview */}
              {replyingTo && (
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-blue-700 mb-1 flex items-center">
                        <Reply className="h-3 w-3 mr-1" />
                        Replying to {replyingTo.user_name || 'System'}
                      </div>
                      <div className="text-sm text-gray-700 bg-white px-2 py-1 rounded max-h-16 overflow-y-auto break-words whitespace-pre-wrap leading-relaxed">
                        {replyingTo.message_body.length > 100 
                          ? replyingTo.message_body.substring(0, 100) + '...'
                          : replyingTo.message_body
                        }
                      </div>
                    </div>
                    <button
                      onClick={cancelReply}
                      className="ml-3 p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors duration-200"
                      title="Cancel reply"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={cancelReply}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-100 transition-colors duration-200"
                    >
                      Cancel Reply
                    </button>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="space-y-3">
                <div className="flex space-x-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full border border-gray-300 rounded-2xl px-4 py-3 pr-12 focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-sm bg-white/90 backdrop-blur-sm transition-all duration-200 text-sm sm:text-base"
                      disabled={sending || !isOnline}
                    />
                    {sending && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-rose-500 border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending || !isOnline}
                    className="bg-gradient-to-r from-rose-500 to-pink-600 text-white p-3 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center min-w-[48px]"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <p className="text-gray-500">
                    {sending ? 'Processing message...' : 
                     isOnline ? 'Connected to Penzi system' : 'Offline - check your connection'}
                  </p>
                  <div className="flex items-center space-x-2 text-gray-400">
                    {sending ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent mr-1"></div>
                        Waiting for response...
                      </span>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Press Enter to send</span>
                        {conversation && conversation.messages && conversation.messages.length > 0 && (
                          <button
                            onClick={handleRefreshConversation}
                            disabled={loading}
                            className="text-xs text-rose-500 hover:text-rose-700 underline"
                          >
                            Refresh
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <MessageCircle className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold font-poppins text-gray-900 mb-3">Ready to Connect?</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Start your Penzi journey by clicking the button above to begin a conversation with our intelligent matching system.
              </p>
              <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
                <p className="text-sm text-rose-700 font-medium">
                  💡 Tip: Have your phone number ready for registration
                </p>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Start Conversation Dialog */}
        {showStartDialog && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div 
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={handleDialogCancel}
                aria-hidden="true"
              />

              {/* Center the modal */}
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              {/* Modal panel */}
              <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                {/* Close button */}
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                    onClick={handleDialogCancel}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Modal content */}
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-rose-100 sm:mx-0 sm:h-10 sm:w-10">
                    <MessageCircle className="h-6 w-6 text-rose-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 font-poppins" id="modal-title">
                      Start New Conversation
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Enter your details to begin chatting with the Penzi system.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div className="mt-5 sm:mt-4">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="dialog-name" className="block text-sm font-medium text-gray-700">
                        Your Name
                      </label>
                      <input
                        type="text"
                        id="dialog-name"
                        value={dialogName}
                        onChange={(e) => setDialogName(e.target.value)}
                        placeholder="Enter your full name"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="dialog-phone" className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="dialog-phone"
                        value={dialogPhone}
                        onChange={(e) => setDialogPhone(e.target.value)}
                        placeholder="e.g., 0701234567"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    disabled={!dialogName.trim() || !dialogPhone.trim() || sending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-base font-medium text-white hover:from-rose-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleDialogSubmit}
                  >
                    {sending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Starting...
                      </>
                    ) : (
                      'Start Conversation'
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={sending}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleDialogCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clear All Messages Confirmation Dialog */}
        {showClearAllDialog && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div 
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={() => setShowClearAllDialog(false)}
                aria-hidden="true"
              />

              {/* Center the modal */}
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              {/* Modal panel */}
              <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                {/* Close button */}
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                    onClick={() => setShowClearAllDialog(false)}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Modal content */}
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 font-poppins" id="modal-title">
                      Clear All Messages
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete all messages in this conversation? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleClearAllMessages}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Clearing...
                      </>
                    ) : (
                      'Clear All Messages'
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setShowClearAllDialog(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatTab;