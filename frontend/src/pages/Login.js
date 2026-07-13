import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast.success('Login successful');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-white">
      <div className="w-full max-w-md px-6">
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mb-4">
              <svg width="48" height="48" viewBox="0 0 48 48" className="mx-auto">
                <defs>
                  <linearGradient id="botree-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#F72585'}} />
                    <stop offset="100%" style={{stopColor: '#7209B7'}} />
                  </linearGradient>
                </defs>
                <path d="M24 4 L40 16 L40 32 L24 44 L8 32 L8 16 Z" fill="url(#botree-gradient)" />
                <path d="M24 12 L32 18 L32 30 L24 36 L16 30 L16 18 Z" fill="white" />
                <path d="M24 20 L28 23 L28 29 L24 32 L20 29 L20 23 Z" fill="url(#botree-gradient)" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2" style={{background: 'linear-gradient(135deg, #F72585 0%, #7209B7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>BOTREE SOFTWARE</h1>
            <p className="text-gray-600 font-medium">Proposal Management System</p>
          </div>

          <form onSubmit={handleSubmit} data-testid="login-form" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" data-testid="email-label" className="text-gray-700 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="email-input"
                className="border-gray-300 focus:border-[#F72585] focus:ring-[#F72585]"
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" data-testid="password-label" className="text-gray-700 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="password-input"
                className="border-gray-300 focus:border-[#F72585] focus:ring-[#F72585]"
                placeholder="Enter your password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full text-white font-semibold transition-all shadow-lg hover:shadow-xl"
              style={{background: 'linear-gradient(135deg, #F72585 0%, #7209B7 100%)'}}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;