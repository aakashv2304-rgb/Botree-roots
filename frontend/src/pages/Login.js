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
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1589362281138-e3f7ebe47f1a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwb2ZmaWNlJTIwZGVzayUyMGNsZWFufGVufDB8fHx8MTc4Mzk2NjA0N3ww&ixlib=rb-4.1.0&q=85)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 bg-white/90"></div>
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white border border-[#E4E4E7] p-8 shadow-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Cabinet Grotesk, system-ui, sans-serif' }}>Proposal Tracker</h1>
            <p className="text-[#71717A]">Sign in to manage proposals</p>
          </div>

          <form onSubmit={handleSubmit} data-testid="login-form" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" data-testid="email-label">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="email-input"
                className="border-[#E4E4E7]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" data-testid="password-label">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="password-input"
                className="border-[#E4E4E7]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E4E4E7]">
            <p className="text-xs text-[#71717A] mb-2 uppercase tracking-[0.2em]">Demo Accounts</p>
            <div className="space-y-1 text-sm text-[#71717A]">
              <p>Finance: finance@company.com / Finance@123</p>
              <p>Sales: sales@company.com / Sales@123</p>
              <p>CGO: cgo@company.com / CGO@123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;