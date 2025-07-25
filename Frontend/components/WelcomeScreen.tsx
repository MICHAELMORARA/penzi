'use client';

import React, { useState, useEffect } from 'react';
import { Heart, ArrowRight, Users, MessageCircle, Sparkles } from 'lucide-react';

interface WelcomeScreenProps {
  onComplete: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const welcomeSteps = [
    {
      icon: Heart,
      title: "Welcome to Penzi",
      subtitle: "Find Your Perfect Match",
      description: "Connect with like-minded people and discover meaningful relationships"
    },
    {
      icon: Users,
      title: "Discover People",
      subtitle: "Swipe to Connect",
      description: "Browse through profiles and find people who share your interests and values"
    },
    {
      icon: MessageCircle,
      title: "Start Conversations",
      subtitle: "Chat with Matches",
      description: "When you both like each other, start chatting and get to know each other better"
    },
    {
      icon: Sparkles,
      title: "Ready to Begin?",
      subtitle: "Let's Find Love",
      description: "Join thousands of people who have found their perfect match on Penzi"
    }
  ];

  useEffect(() => {
    if (currentStep < welcomeSteps.length - 1) {
      const timer = setTimeout(() => {
        setIsAnimating(true);
        setTimeout(() => {
          setCurrentStep(prev => prev + 1);
          setIsAnimating(false);
        }, 300);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [currentStep, welcomeSteps.length]);

  const handleSkip = () => {
    onComplete();
  };

  const handleGetStarted = () => {
    onComplete();
  };

  const currentStepData = welcomeSteps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Skip Button */}
        <div className="flex justify-end items-start mb-8">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-600 hover:text-primary-600 transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-white/50"
          >
            Skip
          </button>
        </div>

        {/* Main Content */}
        <div className={`text-center transition-all duration-300 ${isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}`}>
          {/* Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center shadow-lg">
                <Icon className="h-12 w-12 text-white" />
              </div>
              {/* Animated rings */}
              <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-primary-200 animate-ping opacity-20"></div>
              <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-secondary-200 animate-ping opacity-20" style={{ animationDelay: '0.5s' }}></div>
            </div>
          </div>

          {/* Text Content */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-poppins text-gray-900 mb-2">
              {currentStepData.title}
            </h1>
            <p className="text-lg text-primary-600 font-medium mb-4">
              {currentStepData.subtitle}
            </p>
            <p className="text-gray-600 leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Progress Indicators */}
          <div className="flex justify-center space-x-2 mb-8">
            {welcomeSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'bg-gradient-to-r from-primary-500 to-secondary-500 w-8'
                    : index < currentStep
                    ? 'bg-primary-300'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Action Button */}
          {currentStep === welcomeSteps.length - 1 && (
            <button
              onClick={handleGetStarted}
              className="group bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-8 py-3 rounded-xl font-medium font-poppins shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
            >
              <span>Get Started</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
            </button>
          )}
        </div>

        {/* Bottom Branding */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center space-x-2 text-gray-500">
            <Heart className="h-4 w-4 text-primary-500" />
            <span className="text-sm font-poppins">Penzi Dating Platform</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;