import { useState, useEffect, createContext, useContext } from 'react';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

// Create auth context
const AuthContext = createContext(null);

// Auth provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing auth on mount and handle Twitter OAuth callback
  useEffect(() => {
    // Check URL parameters for Twitter OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const handle = urlParams.get('handle');
    const authType = urlParams.get('auth_type');
    const error = urlParams.get('error');
    
    if (error) {
      toast.error('Twitter sign-in hit a snag. Try again?');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setLoading(false);
      return;
    }
    
    if (token && handle && authType === 'twitter') {
      // Twitter OAuth successful
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_handle', handle);
      localStorage.setItem('auth_type', authType);
      setUser({ handle, token, authType });
      
      // Clean URL
      window.history.replaceState({}, document.title, '/');
      
      // Set a flag to indicate we just authenticated
      sessionStorage.setItem('justAuthenticated', 'true');
      sessionStorage.setItem('authHandle', handle);
      
      toast.success(`Welcome aboard, @${handle}! 🎉`);
      setLoading(false);
      return;
    }
    
    // Check for existing auth
    const existingToken = localStorage.getItem('auth_token');
    const existingHandle = localStorage.getItem('auth_handle');
    const existingAuthType = localStorage.getItem('auth_type') || 'secret_key';
    
    if (existingToken && existingHandle) {
      setUser({ handle: existingHandle, token: existingToken, authType: existingAuthType });
    }
    
    setLoading(false);
  }, []);

  // Login function
  const login = async (handle, secretKey) => {
    try {
      const response = await userAPI.authenticate(handle, secretKey);
      
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('auth_handle', handle);
        localStorage.setItem('auth_type', 'secret_key');
        setUser({ handle, token: response.token, authType: 'secret_key' });
        toast.success('You\'re in! Let\'s get some questions 🚀');
        return true;
      }
    } catch (error) {
      toast.error(error.message || 'Hmm, that didn\'t work. Check your credentials?');
      return false;
    }
  };

  // Twitter login function
  const loginWithTwitter = () => {
    // In production (Railway), use relative URL. In development, use localhost.
    const isProduction = window.location.hostname !== 'localhost';
    const apiUrl = isProduction 
      ? '/api'  // Relative URL for production
      : (import.meta.env.VITE_API_URL || 'http://localhost:5001/api');
    
    window.location.href = `${apiUrl}/auth/twitter`;
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_handle');
    localStorage.removeItem('auth_type');
    setUser(null);
    toast.success('Signed out. See you soon! 👋');
  };

  // Check if user owns a specific handle
  const ownsHandle = (handle) => {
    if (!user?.handle || !handle) return false;
    return user.handle.toLowerCase() === handle.toLowerCase();
  };

  const value = {
    user,
    loading,
    login,
    loginWithTwitter,
    logout,
    ownsHandle,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
} 