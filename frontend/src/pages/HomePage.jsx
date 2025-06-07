import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { userAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Loading from '../components/Loading';

export default function HomePage() {
  const navigate = useNavigate();
  const { loginWithTwitter, user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [redirecting, setRedirecting] = React.useState(false);

  // Handle post-authentication redirect
  useEffect(() => {
    const justAuth = sessionStorage.getItem('justAuthenticated');
    const authHandle = sessionStorage.getItem('authHandle');
    
    if (justAuth === 'true' && authHandle && isAuthenticated) {
      setRedirecting(true);
      sessionStorage.removeItem('justAuthenticated');
      sessionStorage.removeItem('authHandle');
      navigate(`/inbox/${authHandle}`);
    }
  }, [isAuthenticated, navigate]);

  // Fetch user directory
  const { data: directory, isLoading: directoryLoading, error: directoryError } = useQuery({
    queryKey: ['userDirectory'],
    queryFn: () => userAPI.getDirectory(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    onError: (error) => {
      console.error('Directory fetch error:', error);
    }
  });

  // Debug logging
  React.useEffect(() => {
    if (directory) {
      console.log('Directory data:', directory);
    }
    if (directoryError) {
      console.error('Directory error:', directoryError);
    }
  }, [directory, directoryError]);

  if (authLoading || redirecting) {
    return <Loading size="lg" className="mt-20" showMessage />;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 text-gray-800">
              Ask Traders Anything
            </h1>
            <p className="text-gray-600 mb-2">
              Get honest insights • Stay anonymous • Learn together
            </p>
            {!isAuthenticated && (
              <p className="text-sm text-gray-500">
                Join in 5 seconds with Twitter – no forms, no hassle
              </p>
            )}
          </div>

          {isAuthenticated && user ? (
            // Logged in state
            <div className="space-y-4">
              {/* User info card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold ring-2 ring-white">
                      {user.handle[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">@{user.handle}</p>
                      <p className="text-sm text-gray-600">You're all set! 🚀</p>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-500 hover:text-gray-700"
                    title="Sign out"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate(`/inbox/${user.handle}`)}
                  className="bg-blue-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-600 transform hover:scale-105 transition duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  View Questions
                </button>
                <button
                  onClick={() => navigate(`/u/${user.handle}`)}
                  className="bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transform hover:scale-105 transition duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Your Page
                </button>
              </div>

              {/* Share link */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-2 text-center font-medium">Share to receive questions:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white px-2 py-1 rounded border flex-1 truncate">
                    {window.location.origin}/u/{user.handle}
                  </code>
                  <button
                    onClick={(event) => {
                      navigator.clipboard.writeText(`${window.location.origin}/u/${user.handle}`);
                      // Small haptic feedback via transform
                      const btn = event.currentTarget;
                      btn.style.transform = 'scale(0.95)';
                      setTimeout(() => btn.style.transform = 'scale(1)', 100);
                    }}
                    className="text-blue-500 hover:text-blue-600 transition-transform"
                    title="Copy link"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Not logged in state
            <>
              <button
                onClick={loginWithTwitter}
                className="w-full bg-[#1DA1F2] text-white py-4 rounded-lg font-semibold hover:bg-[#1A8CD8] transform hover:scale-105 transition duration-200 flex items-center justify-center text-lg"
              >
                <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                Continue with Twitter
              </button>

              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 text-center">
                  <strong>Why traders love TraderFM:</strong><br />
                  ✓ Ask tough questions anonymously<br />
                  ✓ Share knowledge without the noise<br />
                  ✓ Build your reputation through answers<br />
                  ✓ Connect with real traders instantly
                </p>
              </div>
            </>
          )}

          {/* User Directory */}
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 mb-3 text-center">
              🔥 Trending Traders
            </p>
            {directoryLoading ? (
              <div className="flex justify-center">
                <Loading size="sm" />
              </div>
            ) : directory?.users?.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {directory.users.slice(0, 10).map((user) => (
                  <button
                    key={user.handle}
                    onClick={() => navigate(`/u/${user.handle}`)}
                    className="flex items-center p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition text-left group"
                  >
                    {user.twitter_profile_image && (
                      <img
                        src={user.twitter_profile_image}
                        alt={user.handle}
                        className="w-8 h-8 rounded-full mr-3 group-hover:ring-2 group-hover:ring-blue-100 transition"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          @{user.handle}
                        </p>
                        {user.auth_type === 'twitter' && (
                          <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                          </svg>
                        )}
                      </div>
                      {user.twitter_name && (
                        <p className="text-xs text-gray-500 truncate">
                          {user.twitter_name}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {user.answer_count} {user.answer_count === 1 ? 'answer' : 'answers'} shared
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center">
                Be the pioneer! You'll be the first trader here 🎯
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 