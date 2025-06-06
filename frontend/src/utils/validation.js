// Handle validation
export const validateHandle = (handle) => {
  const errors = [];
  
  if (!handle || !handle.trim()) {
    errors.push('Handle is required');
    return errors;
  }
  
  if (handle.length < 3) {
    errors.push('Handle must be at least 3 characters');
  }
  
  if (handle.length > 20) {
    errors.push('Handle must be 20 characters or less');
  }
  
  if (!/^[a-z0-9]+$/.test(handle)) {
    errors.push('Handle can only contain lowercase letters and numbers');
  }
  
  if (/^\d+$/.test(handle)) {
    errors.push('Handle cannot be only numbers');
  }
  
  // Reserved handles
  const reserved = ['api', 'admin', 'inbox', 'login', 'signup', 'about', 'help', 'support'];
  if (reserved.includes(handle.toLowerCase())) {
    errors.push('This handle is reserved');
  }
  
  return errors;
};

// Question validation
export const validateQuestion = (text) => {
  const errors = [];
  
  if (!text || !text.trim()) {
    errors.push('Please type a question');
    return errors;
  }
  
  if (text.length < 5) {
    errors.push('Question must be at least 5 characters');
  }
  
  if (text.length > 280) {
    errors.push('Question must be 280 characters or less');
  }
  
  // Check if it's just repeated characters
  if (/^(.)\1+$/.test(text.trim())) {
    errors.push('Please ask a real question');
  }
  
  // Check if it's just spaces and punctuation
  if (!/[a-zA-Z0-9]/.test(text)) {
    errors.push('Question must contain some text');
  }
  
  return errors;
};

// Answer validation
export const validateAnswer = (text) => {
  const errors = [];
  
  if (!text || !text.trim()) {
    errors.push('Answer cannot be empty');
    return errors;
  }
  
  if (text.length > 1000) {
    errors.push('Answer must be 1000 characters or less');
  }
  
  return errors;
};

// Format handle for display
export const formatHandle = (handle) => {
  if (!handle) return '';
  return `@${handle}`;
};

// Format URL for sharing
export const getShareUrl = (handle) => {
  return `${window.location.origin}/u/${handle}`;
}; 