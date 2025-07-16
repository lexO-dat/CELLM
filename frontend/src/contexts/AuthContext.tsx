import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; needsConfirmation: boolean; message?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to convert Supabase user to our User type
const convertSupabaseUser = (supabaseUser: SupabaseUser): User => {
  return {
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
    email: supabaseUser.email || '',
    avatar: supabaseUser.user_metadata?.avatar_url || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face`,
    createdAt: supabaseUser.created_at || new Date().toISOString(),
    supabaseId: supabaseUser.id
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: undefined,
    isLoading: true
  });

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setAuthState({
            isAuthenticated: true,
            user: convertSupabaseUser(session.user),
            isLoading: false
          });
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setAuthState({
            isAuthenticated: true,
            user: convertSupabaseUser(session.user),
            isLoading: false
          });
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            isAuthenticated: false,
            user: undefined,
            isLoading: false
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error.message);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        
        // Return user-friendly error messages
        let userMessage = '';
        if (error.message.includes('Invalid login credentials')) {
          userMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          userMessage = 'Please check your email and click the confirmation link to activate your account.';
        } else if (error.message.includes('Too many requests')) {
          userMessage = 'Too many login attempts. Please wait a moment and try again.';
        } else if (error.status === 403) {
          userMessage = 'Access denied. Please check your internet connection and try again.';
        } else if (error.status === 400) {
          userMessage = 'Invalid request. Please check your email and password format.';
        } else {
          userMessage = `Login failed: ${error.message}`;
        }
        
        return { success: false, message: userMessage };
      }

      if (data.user) {
        setAuthState({
          isAuthenticated: true,
          user: convertSupabaseUser(data.user),
          isLoading: false
        });
        return { success: true };
      }

      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, message: 'Login failed. Please try again.' };
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, message: 'An unexpected error occurred. Please check your internet connection and try again.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setAuthState({
        isAuthenticated: false,
        user: undefined,
        isLoading: false
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; needsConfirmation: boolean; message?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });

      if (error) {
        console.error('Registration error:', error.message);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        
        // Return user-friendly error messages
        let userMessage = '';
        if (error.message.includes('Password should be at least 6 characters')) {
          userMessage = 'Password must be at least 6 characters long.';
        } else if (error.message.includes('User already registered')) {
          userMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (error.message.includes('Invalid email')) {
          userMessage = 'Please enter a valid email address.';
        } else if (error.status === 422) {
          userMessage = 'Registration failed. Please check your information and try again.';
        } else if (error.status === 403) {
          userMessage = 'Registration is currently unavailable. Please try again later.';
        } else {
          userMessage = `Registration failed: ${error.message}`;
        }
        
        return { 
          success: false, 
          needsConfirmation: false, 
          message: userMessage 
        };
      }

      if (data.user) {
        // Check if email confirmation is required
        if (data.user.email_confirmed_at) {
          // User is immediately confirmed and signed in
          setAuthState({
            isAuthenticated: true,
            user: convertSupabaseUser(data.user),
            isLoading: false
          });
          return { 
            success: true, 
            needsConfirmation: false, 
            message: 'Account created and signed in successfully!' 
          };
        } else {
          // User needs to confirm their email
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return { 
            success: true, 
            needsConfirmation: true, 
            message: 'Please check your email and click the confirmation link to activate your account.' 
          };
        }
      }

      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        needsConfirmation: false, 
        message: 'Registration failed. Please try again.' 
      };
    } catch (error) {
      console.error('Registration error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        needsConfirmation: false, 
        message: 'An unexpected error occurred. Please try again.' 
      };
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        console.error('Password reset error:', error.message);
        
        // Return user-friendly error messages
        let userMessage = '';
        if (error.message.includes('User not found')) {
          userMessage = 'No account found with this email address.';
        } else if (error.message.includes('Invalid email')) {
          userMessage = 'Please enter a valid email address.';
        } else if (error.message.includes('Too many requests')) {
          userMessage = 'Too many requests. Please wait a moment and try again.';
        } else {
          userMessage = `Password reset failed: ${error.message}`;
        }
        
        return { success: false, message: userMessage };
      }

      return { success: true, message: 'Password reset email sent! Check your inbox.' };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, message: 'An unexpected error occurred. Please try again.' };
    }
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      logout,
      register,
      resetPassword
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
