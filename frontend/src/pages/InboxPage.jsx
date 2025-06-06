import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { questionsAPI, statsAPI } from '../services/api';
import { validateAnswer } from '../utils/validation';
import { useAuth } from '../hooks/useAuth.jsx';
import Loading from '../components/Loading';

export default function InboxPage() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { ownsHandle, loading: authLoading, user } = useAuth();
  
  const [answeringId, setAnsweringId] = useState(null);
  const [answer, setAnswer] = useState('');
  const [errors, setErrors] = useState([]);

  // Check if already authenticated
  useEffect(() => {
    // Wait for auth to load before checking
    if (authLoading) return;
    
    // If user is not authenticated for this handle, redirect to home
    if (!ownsHandle(handle)) {
      console.log('Auth check failed:', { userHandle: user?.handle, pageHandle: handle });
      toast.error('Please sign in to access your inbox');
      navigate('/');
    }
  }, [handle, ownsHandle, navigate, authLoading, user]);

  // Fetch unanswered questions
  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['questions', handle, 'unanswered'],
    queryFn: () => questionsAPI.getUnanswered(handle),
    enabled: ownsHandle(handle),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['stats', handle],
    queryFn: () => statsAPI.getHandleStats(handle),
    enabled: ownsHandle(handle),
  });

  // Mutation for answering questions
  const answerMutation = useMutation({
    mutationFn: ({ questionId, answerText }) => 
      questionsAPI.answer(questionId, answerText),
    onSuccess: () => {
      queryClient.invalidateQueries(['questions', handle]);
      queryClient.invalidateQueries(['answers', handle]);
      queryClient.invalidateQueries(['stats', handle]);
      
      setAnswer('');
      setAnsweringId(null);
      toast.success('Answer posted!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to post answer');
    },
  });

  // Mutation for deleting questions
  const deleteMutation = useMutation({
    mutationFn: (questionId) => questionsAPI.delete(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['questions', handle]);
      queryClient.invalidateQueries(['stats', handle]);
      toast.success('Question deleted');
    },
  });



  const handleAnswer = (questionId) => {
    const validationErrors = validateAnswer(answer);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    answerMutation.mutate({ questionId, answerText: answer });
  };



  if (authLoading || loadingQuestions) {
    return <Loading size="lg" className="mt-20" />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Inbox for @{handle}</h1>
          <button
            onClick={() => navigate(`/u/${handle}`)}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            View public page →
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{stats.totalQuestions}</p>
              <p className="text-sm text-gray-600">Total Questions</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{stats.totalAnswers}</p>
              <p className="text-sm text-gray-600">Answered</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{questions.length}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </div>
        )}
      </div>

      {/* Share reminder */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-700">
          <strong>Get more questions!</strong> Share your link:{' '}
          <code className="bg-white px-2 py-1 rounded ml-1">
            {window.location.origin}/u/{handle}
          </code>
        </p>
      </div>

      {/* Questions */}
      {questions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-gray-500 mb-2">No new questions</p>
          <p className="text-sm text-gray-400">Share your link to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">
            {questions.length} unanswered question{questions.length !== 1 && 's'}
          </h2>

          {questions.map((q) => (
            <div key={q.id} className="bg-white rounded-lg shadow-sm p-6 transition hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <p className="text-gray-800 flex-1">{q.text}</p>
                <button
                  onClick={() => deleteMutation.mutate(q.id)}
                  disabled={deleteMutation.isLoading}
                  className="ml-4 text-red-500 hover:text-red-600"
                  title="Delete question"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <p className="text-xs text-gray-400 mb-4">
                Asked {format(new Date(q.createdAt), 'MMM d, h:mm a')}
              </p>

              {answeringId === q.id ? (
                <div className="space-y-3">
                  <textarea
                    value={answer}
                    onChange={(e) => {
                      setAnswer(e.target.value);
                      setErrors([]);
                    }}
                    placeholder="Type your answer..."
                    className="w-full p-3 border-2 border-blue-400 rounded-lg resize-none focus:outline-none focus:border-blue-500"
                    rows={3}
                    autoFocus
                    disabled={answerMutation.isLoading}
                  />
                  
                  {errors.length > 0 && (
                    <div className="space-y-1">
                      {errors.map((error, idx) => (
                        <p key={idx} className="text-red-500 text-sm">{error}</p>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAnswer(q.id)}
                      disabled={answerMutation.isLoading || !answer.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {answerMutation.isLoading ? 'Posting...' : 'Post Answer'}
                    </button>
                    <button
                      onClick={() => {
                        setAnsweringId(null);
                        setAnswer('');
                        setErrors([]);
                      }}
                      disabled={answerMutation.isLoading}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAnsweringId(q.id)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                >
                  Answer
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 