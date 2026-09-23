import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { SignIn, Eye, EyeSlash } from '@phosphor-icons/react';
import { toast } from 'sonner';

const BOTREE_LOGO = "https://customer-assets-7cd3h4nn.emergentagent.net/job_proposal-tracker-app/artifacts/12kvgckj_Botree%20Logo-white-bg.webp";
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    setTimeout(() => setPageLoading(false), 500);
  }, []);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'zoho_denied') {
      toast.error('Zoho sign-in was cancelled.');
    } else if (error === 'zoho_failed') {
      toast.error('Zoho sign-in failed. Please try again or use your email and password.');
    }
  }, [searchParams]);

  const handleZohoLogin = () => {
    window.location.href = `${API}/auth/zoho/login`;
  };

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
    <div className="min-h-screen bg-[#F7F4FC] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row animate-fade-in-up">

        {/* LEFT: Branding panel */}
        <div className="relative md:w-[42%] min-h-[200px] md:min-h-[520px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1E1533] to-[#2D1F47] px-8 py-10 md:py-0">
          <div
            className="login-orb-1 absolute w-56 h-56 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #9B30FF 0%, transparent 70%)', top: '-10%', left: '-10%' }}
          ></div>
          <div
            className="login-orb-2 absolute w-56 h-56 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #E64AD1 0%, transparent 70%)', bottom: '-10%', right: '-10%' }}
          ></div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="relative flex items-center justify-center mb-5">
              <div className="login-logo-glow"></div>
              <div className="animate-float bg-white rounded-xl shadow-2xl px-6 py-4 flex items-center justify-center relative z-10">
                <img src={BOTREE_LOGO} alt="Botree Software" className="h-10 w-auto" />
              </div>
            </div>
            <p className="text-[#C3B9D6] text-xs font-semibold tracking-widest uppercase">
              Enterprise Proposal Tracker
            </p>
          </div>
        </div>

        {/* RIGHT: Login form */}
        <div className="md:w-[58%] flex items-center justify-center px-8 py-10 sm:px-12 sm:py-12">
          <div className="w-full max-w-sm">
            <div className="text-center space-y-1 mb-8">
              <h2 className="text-2xl font-bold text-[#1E1533]">
                Welcome Back
              </h2>
              <p className="text-[#7A6B9E] text-sm">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#5B4B7A] font-semibold">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@botree.ai"
                  required
                  data-testid="email-input"
                  className="h-10 bg-[#F7F4FC] border-[#E4DCF0] text-[#1E1533] placeholder:text-[#A99BC7] focus:border-[#9B30FF] focus:ring-[#9B30FF]"
                />
              </div>

              <div className="space-y-2">
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
                    className="h-10 pr-12 bg-[#F7F4FC] border-[#E4DCF0] text-[#1E1533] placeholder:text-[#A99BC7] focus:border-[#9B30FF] focus:ring-[#9B30FF]"
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
                className="w-full h-10 text-base font-bold text-white shadow-md hover:shadow-xl transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #9B30FF 0%, #E64AD1 100%)' }}
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

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-[#E4DCF0]"></div>
              <span className="text-xs text-[#A99BC7] font-medium">OR</span>
              <div className="flex-1 h-px bg-[#E4DCF0]"></div>
            </div>

            <button
              type="button"
              onClick={handleZohoLogin}
              data-testid="zoho-login-button"
              className="w-full h-10 flex items-center justify-center gap-2 rounded-md border border-[#E4DCF0] bg-white text-[#1E1533] font-semibold text-sm hover:bg-[#F7F4FC] transition-colors"
            >
              <SignIn size={18} />
              Sign in with Zoho
            </button>

            <div className="text-center pt-6 mt-6 border-t border-[#E4DCF0]">
              <p className="text-xs text-[#7A6B9E]">
                Botree Software © 2026 | <span className="font-semibold text-[#5B4B7A]">Botree Roots</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
