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
      toast.error('This inbox belongs to someone else. Sign in to view yours!');
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
      toast.success('Answer published! Your insight is now live 🎯');
    },
    onError: (error) => {
      toast.error(error.message || 'Could not publish answer. Please try again.');
    },
  });

  // Mutation for deleting questions
  const deleteMutation = useMutation({
    mutationFn: (questionId) => questionsAPI.delete(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['questions', handle]);
      queryClient.invalidateQueries(['stats', handle]);
      toast.success('Question removed ��️');
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
          <h1 className="text-2xl font-bold">Your Question Hub</h1>
          <button
            onClick={() => navigate(`/u/${handle}`)}
            className="text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
          >
            View your public page
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{stats.totalQuestions}</p>
              <p className="text-sm text-gray-600">Questions received</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{stats.totalAnswers}</p>
              <p className="text-sm text-gray-600">Answers shared</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{questions.length}</p>
              <p className="text-sm text-gray-600">Awaiting answer</p>
            </div>
          </div>
        )}
      </div>

      {/* Share reminder */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-700">
          <strong>💡 Pro tip:</strong> More shares = more questions! Your unique link:{' '}
          <code className="bg-white px-2 py-1 rounded ml-1 font-mono text-xs">
            {window.location.origin}/u/{handle}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/u/${handle}`);
              toast.success('Link copied! Share it everywhere 🚀');
            }}
            className="ml-2 text-blue-600 hover:text-blue-700 underline text-xs"
          >
            Copy
          </button>
        </p>
      </div>

      {/* Questions */}
      {questions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-5xl mb-3 animate-bounce">📭</p>
          <p className="text-gray-700 font-semibold mb-2">Your inbox is empty</p>
          <p className="text-sm text-gray-500 mb-4">Questions will appear here when people ask them</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/u/${handle}`);
              toast.success('Link copied! Now share it 🎉');
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 active-press"
          >
            Copy your link to share
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">
            {questions.length === 1 
              ? '1 question waiting for your wisdom' 
              : `${questions.length} questions waiting for your wisdom`
            }
          </h2>

          {questions.map((q) => (
            <div key={q.id} className="bg-white rounded-lg shadow-sm p-6 transition hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <p className="text-gray-800 flex-1 text-lg">{q.text}</p>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this question? This cannot be undone.')) {
                      deleteMutation.mutate(q.id);
                    }
                  }}
                  disabled={deleteMutation.isLoading}
                  className="ml-4 text-gray-400 hover:text-red-500 transition"
                  title="Delete question"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <p className="text-xs text-gray-400 mb-4">
                Asked {format(new Date(q.createdAt), 'MMM d · h:mm a')}
              </p>

              {answeringId === q.id ? (
                <div className="space-y-3">
                  <textarea
                    value={answer}
                    onChange={(e) => {
                      setAnswer(e.target.value);
                      setErrors([]);
                    }}
                    placeholder="Share your insights... Be helpful, honest, and specific!"
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
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed active-press"
                    >
                      {answerMutation.isLoading ? 'Publishing...' : 'Publish Answer'}
                    </button>
                    <button
                      onClick={() => {
                        setAnsweringId(null);
                        setAnswer('');
                        setErrors([]);
                      }}
                      disabled={answerMutation.isLoading}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 active-press"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAnsweringId(q.id);
                    // Auto-focus will happen due to autoFocus prop on textarea
                  }}
                  className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition active-press font-medium"
                >
                  Write Answer →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 