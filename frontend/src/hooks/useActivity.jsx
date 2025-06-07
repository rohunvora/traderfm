import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import axios from 'axios';

// Custom toast with profile image
const ActivityToast = ({ message, imageUrl, handle }) => (
  <div className="flex items-center gap-3">
    {imageUrl && (
      <img 
        src={imageUrl} 
        alt={handle} 
        className="w-8 h-8 rounded-full"
      />
    )}
    <div>
      <p className="text-sm font-medium">{message}</p>
      {handle && <p className="text-xs text-gray-500">@{handle}</p>}
    </div>
  </div>
);

export function useActivity() {
  const seenIds = useRef(new Set());
  const lastCheckRef = useRef(new Date().toISOString());
  
  const { data } = useQuery({
    queryKey: ['activity', lastCheckRef.current],
    queryFn: async () => {
      const response = await axios.get('/api/activity', {
        params: { since: lastCheckRef.current }
      });
      return response.data;
    },
    refetchInterval: 5000, // Poll every 5 seconds
    enabled: true,
  });

  useEffect(() => {
    if (!data) return;

    // Process new questions
    data.questions?.forEach(question => {
      if (!seenIds.current.has(`q-${question.id}`)) {
        seenIds.current.add(`q-${question.id}`);
        
        // Don't show notification for questions older than 10 seconds
        const age = Date.now() - new Date(question.created_at).getTime();
        if (age < 10000) {
          toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} bg-white shadow-lg rounded-lg p-4 max-w-md`}>
              <ActivityToast
                message={`New question for @${question.user_handle}`}
                handle={null}
              />
              <p className="text-xs text-gray-600 mt-1 truncate">"{question.text}"</p>
            </div>
          ), {
            duration: 4000,
            position: 'bottom-right',
          });
        }
      }
    });

    // Process new answers
    data.answers?.forEach(answer => {
      if (!seenIds.current.has(`a-${answer.id}`)) {
        seenIds.current.add(`a-${answer.id}`);
        
        const age = Date.now() - new Date(answer.created_at).getTime();
        if (age < 10000) {
          toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} bg-white shadow-lg rounded-lg p-4 max-w-md`}>
              <ActivityToast
                message={`@${answer.user_handle} just answered`}
                imageUrl={answer.twitter_profile_image}
                handle={answer.user_handle}
              />
              <p className="text-xs text-gray-600 mt-1 truncate">Q: "{answer.question_text}"</p>
            </div>
          ), {
            duration: 5000,
            position: 'bottom-right',
          });
        }
      }
    });

    // Process new users
    data.users?.forEach(user => {
      if (!seenIds.current.has(`u-${user.id}`)) {
        seenIds.current.add(`u-${user.id}`);
        
        const age = Date.now() - new Date(user.created_at).getTime();
        if (age < 10000) {
          toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} bg-white shadow-lg rounded-lg p-4 max-w-md`}>
              <ActivityToast
                message={`${user.twitter_name || user.handle} just joined! 🎉`}
                imageUrl={user.twitter_profile_image}
                handle={user.handle}
              />
            </div>
          ), {
            duration: 6000,
            position: 'bottom-right',
          });
        }
      }
    });

    // Update last check time
    if (data.timestamp) {
      lastCheckRef.current = data.timestamp;
    }

    // Clean up old IDs to prevent memory leak
    if (seenIds.current.size > 1000) {
      const idsArray = Array.from(seenIds.current);
      seenIds.current = new Set(idsArray.slice(-500));
    }
  }, [data]);

  return { activityData: data };
} 