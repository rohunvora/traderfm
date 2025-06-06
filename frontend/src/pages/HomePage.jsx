import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { userAPI } from '../services/api';
import { validateHandle } from '../utils/validation';
import Loading from '../components/Loading';

export default function HomePage() {
  const navigate = useNavigate();
  const [handle, setHandle] = useState('');
  const [errors, setErrors] = useState([]);

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

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              <strong>How it works:</strong><br />
              1. Pick a handle<br />
              2. Share your link<br />
              3. Get anonymous trading questions<br />
              4. Share your market insights
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Popular traders: 
              <button
                onClick={() => navigate('/u/cryptoking')}
                className="ml-2 text-blue-500 hover:underline"
              >
                @cryptoking
              </button>
              <button
                onClick={() => navigate('/u/stockguru')}
                className="ml-2 text-blue-500 hover:underline"
              >
                @stockguru
              </button>
              <button
                onClick={() => navigate('/u/forexmaster')}
                className="ml-2 text-blue-500 hover:underline"
              >
                @forexmaster
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 