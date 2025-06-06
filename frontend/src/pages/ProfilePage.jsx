import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { questionsAPI, answersAPI, userAPI } from '../services/api';
import { validateQuestion } from '../utils/validation';
import { containsProfanity, getProfanityMessage } from '../utils/profanity';
import { useAuth } from '../hooks/useAuth';
import Loading from '../components/Loading';

export default function ProfilePage() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const { ownsHandle } = useAuth();
  const [question, setQuestion] = useState('');
  const [errors, setErrors] = useState([]);
  const [showSecretKey, setShowSecretKey] = useState(false);

  // Check if handle exists
  const { data: handleExists, isLoading: checkingHandle } = useQuery({
    queryKey: ['handle', handle],
    queryFn: () => userAPI.checkHandle(handle),
    retry: false,
    onError: () => {
      toast.error('This handle does not exist');
      navigate('/');
    },
  });

  // Fetch answers
  const { data: answersData, isLoading: loadingAnswers } = useQuery({
    queryKey: ['answers', handle],
    queryFn: () => answersAPI.getByHandle(handle),
    enabled: !!handleExists,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Mutation for asking questions
  const askQuestionMutation = useMutation({
    mutationFn: (text) => questionsAPI.ask(handle, text),
    onSuccess: () => {
      setQuestion('');
      toast.success('Question sent! The trader will see it soon.');
    },
    onError: (error) => {
      if (error.message?.includes('rate limit')) {
        toast.error('Too many questions! Please wait a bit.');
      } else {
        toast.error(error.message || 'Failed to send question');
      }
    },
  });

  // Check for secret key in session storage
  useEffect(() => {
    const secretKey = sessionStorage.getItem(`secret_${handle}`);
    if (secretKey) {
      setShowSecretKey(true);
      // Clear after showing
      setTimeout(() => {
        sessionStorage.removeItem(`secret_${handle}`);
        setShowSecretKey(false);
      }, 10000);
    }
  }, [handle]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate question
    const validationErrors = validateQuestion(question);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Check profanity
    if (containsProfanity(question)) {
      setErrors([getProfanityMessage()]);
      return;
    }

    askQuestionMutation.mutate(question);
  };

  if (checkingHandle || loadingAnswers) {
    return <Loading size="lg" className="mt-20" />;
  }

  const answers = answersData?.answers || [];
  const totalAnswers = answersData?.total || 0;
  const isOwner = ownsHandle(handle);
  const shareUrl = `${window.location.origin}/u/${handle}`;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Secret key notification */}
      {showSecretKey && (
        <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            ⚠️ Important: Save your secret key!
          </p>
          <p className="text-sm text-yellow-700 mb-2">
            Your secret key is: <code className="bg-yellow-100 px-2 py-1 rounded font-mono">{sessionStorage.getItem(`secret_${handle}`)}</code>
          </p>
          <p className="text-xs text-yellow-600">
            You'll need this to access your inbox and answer questions. This message will disappear in a few seconds.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">@{handle}</h1>
          {isOwner && (
            <button
              onClick={() => navigate(`/inbox/${handle}`)}
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              Go to Inbox →
            </button>
          )}
        </div>
        
        <p className="text-gray-600 mb-4">
          Ask me anything about trading, markets, or investment strategies!
        </p>

        {/* Ask question form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <textarea
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  setErrors([]);
                }}
                placeholder="What would you like to know?"
                className="w-full p-4 border-2 border-gray-200 rounded-lg resize-none focus:outline-none focus:border-blue-400 transition"
                rows={3}
                maxLength={280}
                disabled={askQuestionMutation.isLoading}
              />
              <div className="absolute bottom-2 right-2 text-sm text-gray-400">
                {question.length}/280
              </div>
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
            disabled={askQuestionMutation.isLoading || !question.trim()}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transform hover:scale-105 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {askQuestionMutation.isLoading ? 'Sending...' : 'Send Anonymous Question'}
          </button>
        </form>
      </div>

      {/* Answers section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold mb-6">
          Recent Answers ({totalAnswers})
        </h2>

        {answers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">No answers yet</p>
            <p className="text-sm text-gray-400">Be the first to ask something!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {answers.map((answer) => (
              <div key={answer.id} className="border-l-4 border-blue-100 pl-4 py-2">
                <p className="text-gray-600 mb-2">
                  <span className="font-semibold">Q:</span> {answer.questionText}
                </p>
                <p className="text-gray-900">
                  <span className="font-semibold">A:</span> {answer.answerText}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {format(new Date(answer.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share section */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 text-center mb-2">
          Share this page to get more questions:
        </p>
        <div className="flex items-center justify-center gap-2">
          <code className="bg-white px-3 py-1 rounded border text-sm">{shareUrl}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              toast.success('Link copied!');
            }}
            className="text-blue-500 hover:text-blue-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Access inbox prompt */}
      {!isOwner && (
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              const secretKey = prompt('Enter secret key to access inbox:');
              if (secretKey) {
                // Try to authenticate
                navigate(`/inbox/${handle}?key=${secretKey}`);
              }
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Own this page? Access your inbox →
          </button>
        </div>
      )}
    </div>
  );
} 