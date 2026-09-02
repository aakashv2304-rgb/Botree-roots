import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { SignIn, Eye, EyeSlash, ShieldCheck, ChartLineUp, FileText } from '@phosphor-icons/react';
import { toast } from 'sonner';

const BOTREE_LOGO = "https://customer-assets-7cd3h4nn.emergentagent.net/job_proposal-tracker-app/artifacts/12kvgckj_Botree%20Logo-white-bg.webp";

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
      <div className="min-h-screen bg-[#F7F4FC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#9B30FF]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* LEFT: Branding panel with animated logo */}
      <div className="relative lg:w-1/2 min-h-[280px] lg:min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1E1533] via-[#2D1F47] to-[#1E1533]">
        {/* Ambient drifting gradient orbs */}
        <div
          className="login-orb-1 absolute w-72 h-72 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #9B30FF 0%, transparent 70%)', top: '10%', left: '10%' }}
        ></div>
        <div
          className="login-orb-2 absolute w-80 h-80 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #E64AD1 0%, transparent 70%)', bottom: '5%', right: '5%' }}
        ></div>

        <div className="relative z-10 flex flex-col items-center px-8 py-12 text-center">
          {/* Animated logo with pulsing rings */}
          <div className="relative flex items-center justify-center mb-8" style={{ width: 140, height: 140 }}>
            <div className="login-logo-ring ring-1"></div>
            <div className="login-logo-ring ring-2"></div>
            <div className="login-logo-ring ring-3"></div>
            <div className="animate-float bg-white rounded-3xl shadow-2xl p-5 flex items-center justify-center relative z-10">
              <img src={BOTREE_LOGO} alt="Botree Software" className="h-14 w-auto" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2 font-heading">
            Botree <span className="login-brand-glow bg-gradient-to-r from-[#9B30FF] to-[#E64AD1] bg-clip-text text-transparent">Roots</span>
          </h1>
          <p className="text-[#C3B9D6] text-base max-w-sm mb-10">
            Run your route-to-market business in one place — proposals, approvals, and profitability, all connected.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-md">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <FileText size={20} className="text-[#E64AD1]" />
              </div>
              <span className="text-xs text-[#C3B9D6]">Proposal Tracking</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <ShieldCheck size={20} className="text-[#E64AD1]" />
              </div>
              <span className="text-xs text-[#C3B9D6]">Secure Approvals</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <ChartLineUp size={20} className="text-[#E64AD1]" />
              </div>
              <span className="text-xs text-[#C3B9D6]">Live Profitability</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Login form */}
      <div className="lg:w-1/2 flex items-center justify-center bg-[#F7F4FC] px-6 py-12 lg:py-0">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="text-center space-y-2 mb-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-[#1E1533]">
              Welcome Back
            </h2>
            <p className="text-[#7A6B9E]">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 animate-slide-in-left" style={{animationDelay: '0.1s'}}>
              <Label htmlFor="email" className="text-[#5B4B7A] font-semibold">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@botree.ai"
                required
                data-testid="email-input"
                className="h-10 bg-[#FFFFFF] border-[#E4DCF0] text-[#1E1533] placeholder:text-[#A99BC7] focus:border-[#9B30FF] focus:ring-[#9B30FF]"
              />
            </div>

            <div className="space-y-2 animate-slide-in-left" style={{animationDelay: '0.2s'}}>
              <Label htmlFor="password" className="text-[#5B4B7A] font-semibold">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  data-testid="password-input"
                  className="h-10 pr-12 bg-[#FFFFFF] border-[#E4DCF0] text-[#1E1533] placeholder:text-[#A99BC7] focus:border-[#9B30FF] focus:ring-[#9B30FF]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#8577A3] hover:text-[#1E1533] transition-colors"
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
                animationDelay: '0.3s'
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

          <div className="text-center pt-8 mt-8 border-t border-[#E4DCF0] animate-fade-in" style={{animationDelay: '0.4s'}}>
            <p className="text-xs text-[#7A6B9E]">
              Botree Software © 2026 | <span className="font-semibold text-[#5B4B7A]">Botree Roots</span>
            </p>
            <p className="text-xs text-[#8577A3] mt-1">
              Secure Authentication System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
