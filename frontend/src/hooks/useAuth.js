import { useState, useEffect, createContext, useContext } from 'react';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

// Create auth context
const AuthContext = createContext(null);

// Auth provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing auth on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const handle = localStorage.getItem('auth_handle');
    
    if (token && handle) {
      setUser({ handle, token });
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
        setUser({ handle, token: response.token });
        toast.success('Successfully authenticated!');
        return true;
      }
    } catch (error) {
      toast.error(error.message || 'Invalid credentials');
      return false;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_handle');
    setUser(null);
    toast.success('Logged out successfully');
  };

  // Check if user owns a specific handle
  const ownsHandle = (handle) => {
    return user?.handle === handle;
  };

  const value = {
    user,
    loading,
    login,
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