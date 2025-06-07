import React from 'react';

const loadingMessages = [
  "Loading the good stuff...",
  "Fetching insights...",
  "Gathering wisdom...",
  "Almost there...",
  "Preparing your content...",
  "Just a moment...",
  "Loading amazing things..."
];

export default function Loading({ size = 'md', className = '', showMessage = false }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];

  return (
    <div className={`flex flex-col justify-center items-center ${className}`}>
      <div className={`${sizeClasses[size]} animate-spin`}>
        <svg className="w-full h-full" viewBox="0 0 24 24">
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
            fill="none"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      {showMessage && size === 'lg' && (
        <p className="mt-4 text-gray-600 animate-pulse">{randomMessage}</p>
      )}
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loading size="lg" showMessage />
    </div>
  );
}

export function LoadingOverlay({ message }) {
  const defaultMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-3">
        <Loading size="md" />
        <p className="text-gray-600">{message || defaultMessage}</p>
      </div>
    </div>
  );
} 