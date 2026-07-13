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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="w-full max-w-md px-6">
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-[#0066CC] mb-2">Botree Software</h1>
            <p className="text-gray-600">Proposal Management System</p>
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
                className="border-gray-300"
                placeholder="Enter your email"
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
                className="border-gray-300"
                placeholder="Enter your password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full bg-[#0066CC] hover:bg-[#0052A3] text-white transition-colors"
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