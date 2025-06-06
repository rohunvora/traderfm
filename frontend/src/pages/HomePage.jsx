import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { userAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Loading from '../components/Loading';

export default function HomePage() {
  const navigate = useNavigate();
  const { loginWithTwitter, user, isAuthenticated, loading: authLoading } = useAuth();
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
  const { data: directory, isLoading: directoryLoading } = useQuery({
    queryKey: ['userDirectory'],
    queryFn: () => userAPI.getDirectory(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (authLoading || redirecting) {
    return <Loading size="lg" className="mt-20" />;
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
              Zero signup. Anonymous questions. Public answers.
            </p>
            <p className="text-sm text-gray-500">
              Sign in with your Twitter to get started
            </p>
          </div>

          <button
            onClick={loginWithTwitter}
            className="w-full bg-[#1DA1F2] text-white py-4 rounded-lg font-semibold hover:bg-[#1A8CD8] transform hover:scale-105 transition duration-200 flex items-center justify-center text-lg"
          >
            <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
            Connect with Twitter
          </button>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              <strong>How it works:</strong><br />
              1. Sign in with Twitter<br />
              2. Your Twitter handle becomes your TraderFM handle<br />
              3. Share your link to get anonymous questions<br />
              4. Answer publicly and share your insights
            </p>
          </div>

          {/* User Directory */}
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 mb-3 text-center">
              Active Traders
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
                    className="flex items-center p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition text-left"
                  >
                    {user.twitter_profile_image && (
                      <img
                        src={user.twitter_profile_image}
                        alt={user.handle}
                        className="w-8 h-8 rounded-full mr-3"
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
                        {user.answer_count} answers
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center">
                No traders yet. Be the first!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 