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
      const result = await login(email, password);
      if (result.success) {
        toast.success('Welcome back!');
        setTimeout(() => navigate('/dashboard'), 300);
      } else {
        toast.error(result.error || 'Invalid credentials');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#150E29] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#9B30FF]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#150E29] relative">
      {/* Header with Logo */}
      <div className="absolute top-0 left-0 right-0 px-6 py-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-1.5 inline-flex">
            <img 
              src="https://customer-assets-7cd3h4nn.emergentagent.net/job_proposal-tracker-app/artifacts/12kvgckj_Botree%20Logo-white-bg.webp" 
              alt="Botree Software Logo" 
              className="h-8 w-auto"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen px-4 py-20">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Login Card */}
          <div className="bg-[#1E1533] border border-[#3D2A5C] rounded-2xl shadow-lg p-10 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2 animate-fade-in" style={{animationDelay: '0.1s'}}>
              <h2 className="text-2xl font-bold text-[#F5F3FA]">
                Welcome Back
              </h2>
              <p className="text-[#9E8FC2]">Sign in to Botree Roots</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2 animate-slide-in-left" style={{animationDelay: '0.2s'}}>
                <Label htmlFor="email" className="text-[#B9AED4] font-semibold">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@botree.com"
                  required
                  data-testid="email-input"
                  className="h-10 bg-[#150E29] border-[#3D2A5C] text-[#F5F3FA] placeholder:text-[#6B5D91] focus:border-[#9B30FF] focus:ring-[#9B30FF]"
                />
              </div>

              <div className="space-y-2 animate-slide-in-left" style={{animationDelay: '0.3s'}}>
                <Label htmlFor="password" className="text-[#B9AED4] font-semibold">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    data-testid="password-input"
                    className="h-10 pr-12 bg-[#150E29] border-[#3D2A5C] text-[#F5F3FA] placeholder:text-[#6B5D91] focus:border-[#9B30FF] focus:ring-[#9B30FF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#8B7FAE] hover:text-[#F5F3FA] transition-colors"
                  >
                    {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                data-testid="login-button"
                className="w-full h-10 text-base font-bold text-white shadow-md hover:shadow-xl transition-all duration-300 animate-slide-in-left"
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
            <div className="text-center pt-6 border-t border-[#3D2A5C] animate-fade-in" style={{animationDelay: '0.5s'}}>
              <p className="text-xs text-[#9E8FC2]">
                Botree Software © 2026 | <span className="font-semibold text-[#B9AED4]">Botree Roots</span>
              </p>
              <p className="text-xs text-[#8B7FAE] mt-1">
                Secure Authentication System
              </p>
            </div>
          </div>

          {/* Bottom tagline */}
          <div className="text-center mt-6 animate-fade-in" style={{animationDelay: '0.6s'}}>
            <p className="text-sm text-[#B9AED4]">
              Run Your Route-to-Market Business in <span className="font-bold bg-gradient-to-r from-[#7518F2] to-[#E64AD1] bg-clip-text text-transparent">One Place</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
