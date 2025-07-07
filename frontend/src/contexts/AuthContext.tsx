import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { User, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// User database for authentication
const USERS: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com', 
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5bb?w=100&h=100&fit=crop&crop=face',
    createdAt: new Date().toISOString()
  }
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: undefined,
    isLoading: true
  });

  useEffect(() => {
    // Check for existing session on mount
    const savedUser = Cookies.get('cellm_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setAuthState({
          isAuthenticated: true,
          user,
          isLoading: false
        });
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        Cookies.remove('cellm_user');
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    // Authenticate user
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = USERS.find(u => u.email === email);
    if (user && password === 'password') { 
      setAuthState({
        isAuthenticated: true,
        user,
        isLoading: false
      });
      
      // Save to cookies (expires in 7 days)
      Cookies.set('cellm_user', JSON.stringify(user), { expires: 7 });
      return true;
    }
    
    setAuthState(prev => ({ ...prev, isLoading: false }));
    return false;
  };

  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      user: undefined,
      isLoading: false
    });
    Cookies.remove('cellm_user');
  };

  const register = async (name: string, email: string, _password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    // User registration
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const existingUser = USERS.find(u => u.email === email);
    if (existingUser) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false; // User already exists
    }
    
    const newUser: User = {
      id: (USERS.length + 1).toString(),
      name,
      email,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face`,
      createdAt: new Date().toISOString()
    };
    
    USERS.push(newUser);
    
    setAuthState({
      isAuthenticated: true,
      user: newUser,
      isLoading: false
    });
    
    Cookies.set('cellm_user', JSON.stringify(newUser), { expires: 7 });
    return true;
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      logout,
      register
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
