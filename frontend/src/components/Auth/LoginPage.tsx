import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const { login, register, resetPassword, isLoading } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (isResetMode) {
        const result = await resetPassword(formData.email);
        if (result.success) {
          setSuccess(result.message || 'Password reset email sent! Check your inbox.');
        } else {
          setError(result.message || 'Failed to send password reset email. Please try again.');
        }
      } else if (isLoginMode) {
        const result = await login(formData.email, formData.password);
        if (!result.success) {
          setError(result.message || 'Login failed. Please try again.');
        }
      } else {
        const result = await register(formData.name, formData.email, formData.password);
        if (!result.success) {
          setError(result.message || 'Registration failed. Please try again.');
        } else if (result.needsConfirmation) {
          setIsAwaitingConfirmation(true);
          setSuccess(result.message || 'Please check your email and click the confirmation link to activate your account.');
        } else {
          setSuccess(result.message || 'Account created successfully!');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md"
      >
        {/* Email Confirmation Screen */}
        {isAwaitingConfirmation ? (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Mail className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Check Your Email</h1>
            <p className="text-gray-600 mb-6">
              We've sent a confirmation link to <strong>{formData.email}</strong>
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                📧 Check your email and click the confirmation link to activate your account.
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Didn't receive the email? Check your spam folder or try a different email address.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setIsAwaitingConfirmation(false);
                    setIsLoginMode(true);
                    setFormData({ name: '', email: '', password: '' });
                    setSuccess('');
                    setError('');
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Back to Login
                </button>
                
                <button
                  onClick={() => {
                    setIsAwaitingConfirmation(false);
                    setIsLoginMode(false);
                    setSuccess('');
                    setError('');
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Regular Login/Register/Reset Form */
          <>
            {/* Header */}
            <div className="text-center mb-6 md:mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="w-12 h-12 md:w-16 md:h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                {isResetMode ? (
                  <ArrowLeft className="w-6 h-6 md:w-8 md:h-8 text-white" />
                ) : (
                  <LogIn className="w-6 h-6 md:w-8 md:h-8 text-white" />
                )}
              </motion.div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {isResetMode ? 'Reset Password' : 'Welcome to CELLM'}
              </h1>
              <p className="text-sm md:text-base text-gray-600">
                {isResetMode 
                  ? 'Enter your email to receive a password reset link'
                  : isLoginMode 
                  ? 'Sign in to your account' 
                  : 'Create your account'
                }
              </p>
            </div>

            {/* Email Confirmation Banner for Registration */}
            {!isLoginMode && !isResetMode && (
              <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">
                      📧 Email Confirmation Required
                    </h3>
                    <p className="text-xs text-blue-800 mb-2">
                      After registering, you'll receive an email with a confirmation link. 
                      <strong> You must click this link to activate your account before you can log in.</strong>
                    </p>
                    <div className="bg-blue-100 rounded p-2 text-xs text-blue-800">
                      <strong>Steps:</strong> 1. Register → 2. Check email → 3. Click confirmation link → 4. Return to login
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLoginMode && !isResetMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required={!isLoginMode && !isResetMode}
                      className="w-full pl-10 pr-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm md:text-base"
                      placeholder="Enter your full name"
                    />
                  </div>
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm md:text-base"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {!isResetMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-12 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm md:text-base"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm"
                >
                  {success}
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-2 md:py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center text-sm md:text-base"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    {isResetMode ? 'Send Reset Email' : isLoginMode ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </motion.button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 text-center space-y-2">
              {isResetMode ? (
                <button
                  onClick={() => {
                    setIsResetMode(false);
                    setError('');
                    setSuccess('');
                    setFormData({ name: '', email: '', password: '' });
                  }}
                  className="text-blue-500 hover:text-blue-600 font-medium"
                >
                  Back to Sign In
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsLoginMode(!isLoginMode);
                      setError('');
                      setSuccess('');
                      setFormData({ name: '', email: '', password: '' });
                    }}
                    className="text-blue-500 hover:text-blue-600 font-medium"
                  >
                    {isLoginMode
                      ? "Don't have an account? Sign up"
                      : 'Already have an account? Sign in'
                    }
                  </button>
                  
                  {isLoginMode && (
                    <div>
                      <button
                        onClick={() => {
                          setIsResetMode(true);
                          setError('');
                          setSuccess('');
                          setFormData({ name: '', email: '', password: '' });
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Forgot your password?
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default LoginPage;
