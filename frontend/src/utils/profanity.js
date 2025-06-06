// Comprehensive profanity filter
const profanityPatterns = [
  // Common profanity (with character variations)
  /\bf+[u\*]+c+k+/i,
  /\bs+h+[i\*]+t+/i,
  /\ba+s+s+h+o+l+e+/i,
  /\bb+[i\*]+t+c+h+/i,
  /\bd+a+m+n+/i,
  /\bh+e+l+l+/i,
  /\bc+r+a+p+/i,
  /\bp+[i\*]+s+s+/i,
  
  // Slurs and offensive terms
  /\bn+[i\*]+g+g+[ae]+r*/i,
  /\bf+a+g+g*[oi]+t*/i,
  /\br+e+t+a+r+d+/i,
  
  // Sexual terms
  /\bd+[i\*]+c+k+/i,
  /\bc+o+c+k+/i,
  /\bp+u+s+s+y+/i,
  /\bc+u+n+t+/i,
  
  // Additional variations
  /\bw+t+f+/i,
  /\bs+t+f+u+/i,
];

// Check if text contains profanity
export const containsProfanity = (text) => {
  if (!text) return false;
  
  // Check against patterns
  const hasProfanity = profanityPatterns.some(pattern => pattern.test(text));
  
  // Also check for attempts to bypass filter with special characters
  const normalizedText = text
    .replace(/[@#$%&*]/g, '') // Remove special chars
    .replace(/[0-9]/g, (match) => {
      // Replace numbers that look like letters
      const replacements = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't' };
      return replacements[match] || match;
    });
  
  return hasProfanity || profanityPatterns.some(pattern => pattern.test(normalizedText));
};

// Clean text by replacing profanity with asterisks
export const cleanProfanity = (text) => {
  if (!text) return text;
  
  let cleaned = text;
  profanityPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, (match) => '*'.repeat(match.length));
  });
  
  return cleaned;
};

// Get a user-friendly error message
export const getProfanityMessage = () => {
  const messages = [
    "Please keep it respectful!",
    "Let's keep things civil.",
    "That language isn't allowed here.",
    "Please rephrase without profanity.",
    "Keep it clean, please!"
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
}; 