// Handle validation
export const validateHandle = (handle) => {
  const errors = [];
  
  if (!handle || !handle.trim()) {
    errors.push('Choose a handle to get started');
    return errors;
  }
  
  if (handle.length < 3) {
    errors.push('Handles need at least 3 characters');
  }
  
  if (handle.length > 20) {
    errors.push('Keep it under 20 characters');
  }
  
  if (!/^[a-z0-9]+$/.test(handle)) {
    errors.push('Use only lowercase letters and numbers');
  }
  
  if (/^\d+$/.test(handle)) {
    errors.push('Mix in some letters with those numbers');
  }
  
  // Reserved handles
  const reserved = ['api', 'admin', 'inbox', 'login', 'signup', 'about', 'help', 'support'];
  if (reserved.includes(handle.toLowerCase())) {
    errors.push('That handle is reserved – try another');
  }
  
  return errors;
};

// Question validation
export const validateQuestion = (text) => {
  const errors = [];
  
  if (!text || !text.trim()) {
    errors.push('Type your question first');
    return errors;
  }
  
  if (text.length < 5) {
    errors.push('Add a bit more detail (5+ characters)');
  }
  
  if (text.length > 280) {
    errors.push('Keep it under 280 characters');
  }
  
  // Check if it's just repeated characters
  if (/^(.)\1+$/.test(text.trim())) {
    errors.push('Ask a real question – we know you\'re curious!');
  }
  
  // Check if it's just spaces and punctuation
  if (!/[a-zA-Z0-9]/.test(text)) {
    errors.push('Add some actual words to your question');
  }
  
  return errors;
};

// Answer validation
export const validateAnswer = (text) => {
  const errors = [];
  
  if (!text || !text.trim()) {
    errors.push('Share your thoughts – even a short answer helps');
    return errors;
  }
  
  if (text.length > 1000) {
    errors.push('Great insights! But keep it under 1000 characters');
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