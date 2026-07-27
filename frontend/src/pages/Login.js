import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import BotreeArrowLogo from '../components/BotreeArrowLogo';
import { SignIn, ArrowRight, Eye, EyeSlash } from '@phosphor-icons/react';
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
    // Simulate initial page load animation
    setTimeout(() => setPageLoading(false), 500);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(email, password);
      toast.success('Welcome back!');
      
      // Animate out before navigation
      setTimeout(() => {
        navigate('/dashboard');
      }, 300);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 space-y-6">
          {/* Logo and Header */}
          <div className="text-center space-y-4 animate-fade-in" style={{animationDelay: '0.1s'}}>
            <div className="flex justify-center animate-bounce-in" style={{animationDelay: '0.2s'}}>
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BotreeArrowLogo width={48} height={48} className="text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2" style={{fontFamily: 'Manrope, sans-serif'}}>
                Proposal Tracker
              </h1>
              <p className="text-gray-400 text-sm">Sign in to manage your proposals</p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 animate-slide-in-left" style={{animationDelay: '0.3s'}}>
              <Label htmlFor="email" className="text-gray-300 font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@botree.com"
                required
                data-testid="email-input"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-pink-500 focus:ring-pink-500/50 h-12 transition-all duration-300"
              />
            </div>

            <div className="space-y-2 animate-slide-in-left" style={{animationDelay: '0.4s'}}>
              <Label htmlFor="password" className="text-gray-300 font-semibold">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  data-testid="password-input"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-pink-500 focus:ring-pink-500/50 h-12 pr-12 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-button"
              className="w-full h-12 text-base font-bold bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg hover:shadow-pink-500/50 transition-all duration-300 transform hover:scale-105 animate-slide-in-left"
              style={{animationDelay: '0.5s'}}
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
                  <ArrowRight size={20} weight="bold" />
                </div>
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="pt-4 border-t border-white/10 animate-fade-in" style={{animationDelay: '0.6s'}}>
            <p className="text-xs text-gray-400 text-center mb-3">Demo Credentials:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { role: 'Sales', email: 'sales@botree.com' },
                { role: 'CGO', email: 'cgo@botree.com' },
                { role: 'Finance', email: 'finance@botree.com' },
                { role: 'Legal', email: 'legal@botree.com' },
                { role: 'CFO', email: 'cfo@botree.com' },
                { role: 'Admin', email: 'admin@botree.com' }
              ].map((user, index) => (
                <button
                  key={user.role}
                  type="button"
                  onClick={() => {
                    setEmail(user.email);
                    setPassword(`${user.role}@123`);
                  }}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 hover:text-white transition-all duration-200 hover:scale-105 animate-fade-in"
                  style={{animationDelay: `${0.7 + index * 0.05}s`}}
                >
                  <div className="font-semibold">{user.role}</div>
                  <div className="text-[10px] text-gray-500">Password: {user.role}@123</div>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 animate-fade-in" style={{animationDelay: '0.9s'}}>
            <p className="text-xs text-gray-500">
              Botree Software © 2026 | Secure Proposal Management
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
