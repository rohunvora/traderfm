import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { questionsAPI, answersAPI, userAPI } from '../services/api';
import { validateQuestion } from '../utils/validation';
import { containsProfanity, getProfanityMessage } from '../utils/profanity';
import { useAuth } from '../hooks/useAuth.jsx';
import Loading from '../components/Loading';

export default function ProfilePage() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const { ownsHandle } = useAuth();
  const [question, setQuestion] = useState('');
  const [errors, setErrors] = useState([]);

  // Check if handle exists
  const { data: profileData, isLoading: checkingHandle, error: profileError } = useQuery({
    queryKey: ['handle', handle],
    queryFn: () => userAPI.checkHandle(handle),
    retry: 1,
    onError: (error) => {
      console.error('Profile check error:', error);
      // Only navigate away for 404 errors
      if (error.status === 404 || error.message === 'Handle not found') {
        toast.error(`Hmm, @${handle} hasn't joined yet. Maybe invite them? 🤔`);
        navigate('/');
      } else {
        toast.error('Having trouble loading this page. Try refreshing?');
      }
    },
  });

  // Fetch answers
  const { data: answersData, isLoading: loadingAnswers } = useQuery({
    queryKey: ['answers', handle],
    queryFn: () => answersAPI.getByHandle(handle),
    enabled: !!profileData?.exists,
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

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {profileData?.twitter_profile_image && (
              <img
                src={profileData.twitter_profile_image}
                alt={handle}
                className="w-12 h-12 rounded-full"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                @{handle}
                {profileData?.auth_type === 'twitter' && (
                  <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                )}
              </h1>
              {profileData?.twitter_name && (
                <p className="text-sm text-gray-500">{profileData.twitter_name}</p>
              )}
            </div>
          </div>
          {isOwner && (
            <button
              onClick={() => navigate(`/inbox/${handle}`)}
              className="text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
            >
              View inbox
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
        
        <p className="text-gray-600 mb-4">
          {isOwner 
            ? "This is your public page. Share it to receive anonymous questions!"
            : `Got a burning question? Ask @${handle} anonymously – they can't see who you are.`
          }
        </p>

        {/* Ask question form - only show if not owner */}
        {!isOwner && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <textarea
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value);
                    setErrors([]);
                  }}
                  placeholder="Ask your question here... Be specific to get the best answer!"
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
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transform hover:scale-105 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none active-press"
            >
              {askQuestionMutation.isLoading ? 'Sending...' : 'Ask Your Question →'}
            </button>
          </form>
        )}
      </div>

      {/* Answers section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold mb-6">
          {totalAnswers === 0 
            ? "Questions & Answers" 
            : `${totalAnswers} Public ${totalAnswers === 1 ? 'Answer' : 'Answers'}`
          }
        </h2>

        {answers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">💭</div>
            <p className="text-gray-500 mb-2">
              {isOwner ? "No questions answered yet" : "No answers yet"}
            </p>
            <p className="text-sm text-gray-400">
              {isOwner 
                ? "Share your page link to start receiving questions!" 
                : "Be brave – ask the first question!"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {answers.map((answer, index) => (
              <div 
                key={answer.id} 
                className="border-l-4 border-blue-100 pl-4 py-2 hover-lift"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <p className="text-gray-600 mb-2">
                  <span className="font-semibold text-gray-400">Anonymous asked:</span> {answer.questionText}
                </p>
                <p className="text-gray-900">
                  <span className="font-semibold text-blue-600">@{handle}:</span> {answer.answerText}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {format(new Date(answer.createdAt), 'MMM d, yyyy · h:mm a')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share section */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
        <p className="text-sm font-medium text-gray-700 text-center mb-2">
          {isOwner ? "📤 Your unique link" : "🔗 Share this trader's page"}
        </p>
        <div className="flex items-center justify-center gap-2">
          <code className="bg-white px-3 py-1 rounded border text-sm font-mono">{shareUrl}</code>
          <button
            onClick={(event) => {
              navigator.clipboard.writeText(shareUrl);
              toast.success('Copied to clipboard! 🎉');
              
              // Visual feedback
              const btn = event.currentTarget;
              btn.classList.add('animate-pulse');
              setTimeout(() => btn.classList.remove('animate-pulse'), 1000);
            }}
            className="text-blue-500 hover:text-blue-600 active-press"
            title="Copy link"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        {isOwner && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Post this on Twitter, share in group chats, or add to your bio
          </p>
        )}
      </div>

    </div>
  );
} 