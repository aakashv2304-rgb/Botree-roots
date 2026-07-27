import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { SignIn, Eye, EyeSlash } from '@phosphor-icons/react';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => setPageLoading(false), 500);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(email, password);
      toast.success('Welcome back!');
      setTimeout(() => navigate('/dashboard'), 300);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E8E4F8] via-[#F5E8F4] to-[#FDD7ED] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#9B30FF]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8E4F8] via-[#F5E8F4] to-[#FDD7ED] relative">
      {/* Header with Logo */}
      <div className="absolute top-0 left-0 right-0 px-8 py-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <img 
            src="https://customer-assets-7cd3h4nn.emergentagent.net/job_proposal-tracker-app/artifacts/12kvgckj_Botree%20Logo-white-bg.webp" 
            alt="Botree Software Logo" 
            className="h-12 w-auto"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen px-4 py-20">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-10 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2 animate-fade-in" style={{animationDelay: '0.1s'}}>
              <h2 className="text-3xl font-bold text-gray-900">
                Welcome Back
              </h2>
              <p className="text-gray-600">Sign in to Proposal Tracker</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2 animate-slide-in-left" style={{animationDelay: '0.2s'}}>
                <Label htmlFor="email" className="text-gray-700 font-semibold">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@botree.com"
                  required
                  data-testid="email-input"
                  className="h-12 border-gray-300 focus:border-[#9B30FF] focus:ring-[#9B30FF]"
                />
              </div>

              <div className="space-y-2 animate-slide-in-left" style={{animationDelay: '0.3s'}}>
                <Label htmlFor="password" className="text-gray-700 font-semibold">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    data-testid="password-input"
                    className="h-12 pr-12 border-gray-300 focus:border-[#9B30FF] focus:ring-[#9B30FF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                data-testid="login-button"
                className="w-full h-12 text-base font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-in-left"
                style={{
                  background: 'linear-gradient(135deg, #9B30FF 0%, #E64AD1 100%)',
                  animationDelay: '0.4s'
                }}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <SignIn size={20} weight="bold" />
                    <span>Sign In</span>
                  </div>
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="text-center pt-6 border-t border-gray-100 animate-fade-in" style={{animationDelay: '0.5s'}}>
              <p className="text-xs text-gray-500">
                Botree Software © 2026 | <span className="font-semibold">Proposal Tracker</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Secure Authentication System
              </p>
            </div>
          </div>

          {/* Bottom tagline */}
          <div className="text-center mt-6 animate-fade-in" style={{animationDelay: '0.6s'}}>
            <p className="text-sm text-gray-700">
              Run Your Route-to-Market Business in <span className="font-bold bg-gradient-to-r from-[#7518F2] to-[#E64AD1] bg-clip-text text-transparent">One Place</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
