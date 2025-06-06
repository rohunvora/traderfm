import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { userAPI } from '../services/api';
import { validateHandle } from '../utils/validation';
import { useAuth } from '../hooks/useAuth';
import Loading from '../components/Loading';

export default function HomePage() {
  const navigate = useNavigate();
  const { loginWithTwitter } = useAuth();
  const [handle, setHandle] = useState('');
  const [errors, setErrors] = useState([]);

  // Fetch user directory
  const { data: directory, isLoading: directoryLoading } = useQuery({
    queryKey: ['userDirectory'],
    queryFn: () => userAPI.getDirectory(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for creating handle
  const createHandleMutation = useMutation({
    mutationFn: (handle) => userAPI.createHandle(handle),
    onSuccess: (data) => {
      // Store the secret key temporarily
      sessionStorage.setItem(`secret_${handle}`, data.secretKey);
      toast.success('Page created successfully!');
      navigate(`/u/${handle}`);
    },
    onError: (error) => {
      if (error.message === 'Handle already exists') {
        // Handle exists, just navigate
        navigate(`/u/${handle}`);
      } else {
        toast.error(error.message || 'Failed to create page');
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate handle
    const validationErrors = validateHandle(handle);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    createHandleMutation.mutate(handle);
  };

  const handleInputChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    setHandle(value);
    setErrors([]); // Clear errors on input change
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 text-gray-800">
              Ask Traders Anything
            </h1>
            <p className="text-gray-600">
              Zero signup. Anonymous questions. Public answers.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose your trading handle
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xl text-gray-400">traderfm.com/</span>
                <input
                  type="text"
                  value={handle}
                  onChange={handleInputChange}
                  placeholder="yourhandle"
                  className="flex-1 px-4 py-2 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
                  maxLength={20}
                  disabled={createHandleMutation.isLoading}
                />
              </div>
              
              {errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {errors.map((error, idx) => (
                    <p key={idx} className="text-red-500 text-sm">{error}</p>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={createHandleMutation.isLoading || !handle}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transform hover:scale-105 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
            >
              {createHandleMutation.isLoading ? (
                <>
                  <Loading size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                'Create Your Page'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <div className="flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-gray-500 text-sm">or</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>
          </div>

          <button
            onClick={loginWithTwitter}
            disabled={createHandleMutation.isLoading}
            className="w-full mt-4 bg-[#1DA1F2] text-white py-3 rounded-lg font-semibold hover:bg-[#1A8CD8] transform hover:scale-105 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
            Connect with Twitter
          </button>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              <strong>How it works:</strong><br />
              1. Pick a handle<br />
              2. Share your link<br />
              3. Get anonymous trading questions<br />
              4. Share your market insights
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