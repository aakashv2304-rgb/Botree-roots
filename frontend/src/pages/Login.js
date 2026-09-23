import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'zoho_denied') {
      toast.error('Zoho sign-in was cancelled.');
    } else if (error === 'zoho_failed') {
      toast.error('Zoho sign-in failed. Please try again or use your email and password.');
    } else if (error === 'zoho_access_denied') {
      toast.error('Your access request was declined. Contact an Admin for help.');
    }
  }, [searchParams]);

  const handleZohoLogin = () => {
    window.location.href = `${API}/auth/zoho/login`;
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    toast.info('Password resets are handled by your Admin — reach out to them directly.');
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');

        .botree-login-surface, .botree-login-surface *, .botree-login-surface *::before, .botree-login-surface *::after {
          box-sizing: border-box;
        }

        html:has(.botree-login-surface), body:has(.botree-login-surface) {
          overflow: hidden;
        }

        .botree-login-surface {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, #110626 0%, #06020f 85%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
          font-family: 'DM Sans', sans-serif;
          overflow-y: auto;
        }

        /* Primary ambient glow, slow breathing pulse */
        .identity-ambient-glow {
          position: absolute;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(255, 0, 127, 0.08) 0%, rgba(120, 12, 227, 0.04) 55%, transparent 100%);
          filter: blur(50px);
          pointer-events: none;
          transform: translate(-50%, -50%);
          top: 50%; left: 50%;
          animation: slowPulse 8s ease-in-out infinite alternate;
        }
        @keyframes slowPulse {
          0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
        }

        /* Extra drifting orbs for a livelier cinematic backdrop */
        .drift-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
          opacity: 0.5;
        }
        .drift-orb-1 {
          width: 340px; height: 340px;
          background: radial-gradient(circle, rgba(255,0,127,0.16) 0%, transparent 70%);
          top: 8%; left: 6%;
          animation: driftA 14s ease-in-out infinite alternate;
        }
        .drift-orb-2 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(115,12,227,0.18) 0%, transparent 70%);
          bottom: 6%; right: 8%;
          animation: driftB 17s ease-in-out infinite alternate;
        }
        .drift-orb-3 {
          width: 220px; height: 220px;
          background: radial-gradient(circle, rgba(81,37,141,0.16) 0%, transparent 70%);
          top: 55%; right: 20%;
          animation: driftC 12s ease-in-out infinite alternate;
        }
        @keyframes driftA {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, 30px) scale(1.15); }
        }
        @keyframes driftB {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-35px, -25px) scale(1.1); }
        }
        @keyframes driftC {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-25px, 35px) scale(0.9); }
        }

        .app-frame-grid {
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          width: 100%;
          max-width: 1120px;
          padding: 40px;
          gap: 70px;
          align-items: center;
        }

        .identity-column {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .brand-lockup-row {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 28px;
          margin-bottom: 24px;
        }

        /* Settles in via entrance keyframes, then keeps a gentle continuous float */
        .vector-brandmark-container {
          width: 90px;
          height: 90px;
          flex-shrink: 0;
          position: relative;
          animation: logoFloat 4.5s ease-in-out infinite 2s;
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        /* Soft rotating glow ring behind the logo */
        .logo-glow-ring {
          position: absolute;
          inset: -14px;
          border-radius: 50%;
          background: conic-gradient(from 0deg, rgba(255,0,127,0.35), rgba(115,12,227,0.35), rgba(255,0,127,0.35));
          filter: blur(18px);
          opacity: 0;
          animation: glowRingIn 1s ease forwards 1.1s, glowRingSpin 6s linear infinite 1.1s;
        }
        @keyframes glowRingIn { to { opacity: 0.55; } }
        @keyframes glowRingSpin { to { transform: rotate(360deg); } }

        .logo-chevron-shape { opacity: 0; transform-origin: center; }

        .chv-top-asset {
          fill: #ff007f;
          transform: translate(20px, -20px) scale(0.9);
          animation: slideAndLockTop 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.2s;
        }
        .chv-bottom-asset {
          fill: #730ce3;
          transform: translate(-20px, 20px) scale(0.9);
          animation: slideAndLockBottom 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.4s;
        }
        @keyframes slideAndLockTop { to { opacity: 1; transform: translate(0, 0) scale(1); } }
        @keyframes slideAndLockBottom { to { opacity: 1; transform: translate(0, 0) scale(1); } }

        .brand-typography-group {
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: left;
        }

        .text-botree-main {
          font-size: 60px;
          font-weight: 900;
          color: #ffffff;
          line-height: 0.75;
          letter-spacing: -1.5px;
          text-transform: uppercase;
          opacity: 0;
          transform: translateX(-15px);
          animation: textRevealMove 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.5s;
          background: linear-gradient(120deg, #ffffff 40%, #ffd6ec 50%, #ffffff 60%);
          background-size: 250% 100%;
          -webkit-background-clip: text;
          background-clip: text;
        }
        .text-botree-main.shimmer-on {
          animation: textRevealMove 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.5s,
                     textShimmer 5s ease-in-out infinite 1.6s;
        }
        @keyframes textShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -50% 0; }
        }

        .text-software-sub {
          display: block;
          font-size: 12px;
          font-weight: 900;
          color: #ffffff;
          line-height: 1;
          letter-spacing: 10px;
          margin-top: 10px;
          padding-left: 2px;
          text-transform: uppercase;
          opacity: 0;
          transform: translateX(-10px);
          animation: textRevealMove 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.7s;
        }
        @keyframes textRevealMove { to { opacity: 1; transform: translateX(0); } }

        .system-meta-tag {
          font-size: 13px;
          font-weight: 500;
          color: #4c4663;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          line-height: 1.5;
          padding-left: 4px;
          opacity: 0;
          transform: translateY(10px);
          animation: elementFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.9s;
        }

        .interface-portal-column {
          display: flex;
          justify-content: flex-end;
          opacity: 0;
          transform: translateY(20px) scale(0.98);
          animation: elementFadeUp 1.0s cubic-bezier(0.16, 1, 0.3, 1) forwards 1.1s;
        }
        @keyframes elementFadeUp { to { opacity: 1; transform: translateY(0) scale(1); } }

        .secure-card-panel {
          background: #ffffff;
          width: 100%;
          max-width: 400px;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.45);
        }

        /* Individually staggered field entrances for a livelier cascading reveal */
        .field-stagger {
          opacity: 0;
          transform: translateY(14px);
          animation: fieldFadeUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .field-stagger:nth-child(1) { animation-delay: 1.3s; }
        .field-stagger:nth-child(2) { animation-delay: 1.42s; }
        @keyframes fieldFadeUp { to { opacity: 1; transform: translateY(0); } }

        .btn-stagger { opacity: 0; transform: translateY(14px); animation: fieldFadeUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards 1.54s; }
        .link-stagger { opacity: 0; animation: fieldFadeIn 0.5s ease forwards 1.64s; }
        .divider-stagger { opacity: 0; animation: fieldFadeIn 0.5s ease forwards 1.72s; }
        .zoho-stagger { opacity: 0; transform: translateY(14px); animation: fieldFadeUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards 1.8s; }
        .footer-stagger { opacity: 0; animation: fieldFadeIn 0.5s ease forwards 1.9s; }
        @keyframes fieldFadeIn { to { opacity: 1; } }

        .control-group { margin-bottom: 20px; display: flex; flex-direction: column; }

        .control-label {
          font-size: 11px;
          font-weight: 700;
          color: #4f566b;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .control-input {
          width: 100%;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 400;
          color: #1a1c21;
          padding: 14px 16px;
          background-color: #ffffff;
          border: 1px solid #e3e6ef;
          border-radius: 8px;
          outline: none;
          transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease;
        }
        .control-input::placeholder { color: #a2a8ba; }
        .control-input:focus {
          border-color: #51258d;
          box-shadow: 0 0 0 4px rgba(81, 37, 141, 0.12);
          transform: translateY(-1px);
        }

        /* Animated gradient sweep across the primary CTA */
        .portal-action-button {
          position: relative;
          overflow: hidden;
          width: 100%;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          background-color: #51258d;
          border: none;
          border-radius: 10px;
          padding: 16px;
          margin-top: 6px;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(81, 37, 141, 0.25);
          transition: transform 0.15s ease, opacity 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        /* Sweep lives on a separate pseudo-element layer so it never conflicts
           with the button's own entrance animation */
        .portal-action-button::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: ctaSweep 3.5s linear infinite;
          pointer-events: none;
        }
        @keyframes ctaSweep { 0% { background-position: 0% 0; } 100% { background-position: 100% 0; } }
        .portal-action-button:hover:not(:disabled) { box-shadow: 0 10px 30px rgba(81, 37, 141, 0.4); transform: translateY(-1px); }
        .portal-action-button:active:not(:disabled) { transform: scale(0.985); }
        .portal-action-button:disabled { opacity: 0.75; cursor: not-allowed; }
        .portal-action-button:disabled::after { animation: none; }

        .portal-utility-link {
          display: block;
          text-align: center;
          margin-top: 18px;
          font-size: 13px;
          font-weight: 700;
          color: #421d75;
          background: none;
          border: none;
          cursor: pointer;
          width: 100%;
          transition: color 0.2s ease;
        }
        .portal-utility-link:hover { color: #ff007f; text-decoration: underline; }

        .portal-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
        .portal-divider-line { flex: 1; height: 1px; background: #e3e6ef; }
        .portal-divider-text { font-size: 11px; color: #a2a8ba; font-weight: 700; letter-spacing: 1px; }

        .zoho-button {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 8px;
          border: 1px solid #e3e6ef;
          background: #ffffff;
          color: #1a1c21;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s ease, transform 0.15s ease;
        }
        .zoho-button:hover { background-color: #f7f4fc; transform: translateY(-1px); }

        .portal-footer {
          text-align: center;
          padding-top: 22px;
          margin-top: 22px;
          border-top: 1px solid #e3e6ef;
          font-size: 11px;
          color: #8a8fa3;
        }

        .password-field-wrap { position: relative; }
        .password-toggle-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #a2a8ba;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
          transition: color 0.2s ease;
        }
        .password-toggle-btn:hover { color: #1a1c21; }

        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 960px) {
          .app-frame-grid {
            grid-template-columns: 1fr;
            gap: 40px;
            max-width: 480px;
            padding: 40px 24px;
          }
          .identity-column { align-items: center; text-align: center; }
          .brand-lockup-row { flex-direction: column; text-align: center; gap: 14px; }
          .brand-typography-group { text-align: center; }
          .text-software-sub { padding-left: 0; }
          .system-meta-tag { text-align: center; padding-left: 0; }
          .interface-portal-column { justify-content: center; }
        }
      `}</style>

      <div className="botree-login-surface">
        <div className="identity-ambient-glow"></div>
        <div className="drift-orb drift-orb-1"></div>
        <div className="drift-orb drift-orb-2"></div>
        <div className="drift-orb drift-orb-3"></div>

        <div className="app-frame-grid">
          <div className="identity-column">
            <div className="brand-lockup-row">
              <div className="vector-brandmark-container">
                <div className="logo-glow-ring"></div>
                <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ position: 'relative' }}>
                  <polygon className="logo-chevron-shape chv-top-asset" points="100,38 150,88 126,88 100,68 74,88 50,88" />
                  <polygon className="logo-chevron-shape chv-bottom-asset" points="100,80 180,160 140,160 100,120 60,160 20,160" />
                </svg>
              </div>
              <div className="brand-typography-group">
                <h1 className="text-botree-main shimmer-on">BOTREE</h1>
                <span className="text-software-sub">SOFTWARE</span>
              </div>
            </div>
            <div className="system-meta-tag">Enterprise Proposal Tracker</div>
          </div>

          <div className="interface-portal-column">
            <div className="secure-card-panel">
              <form onSubmit={handleSubmit}>
                <div className="control-group field-stagger">
                  <label className="control-label" htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    className="control-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@botree.ai"
                    required
                    autoComplete="username"
                    data-testid="email-input"
                  />
                </div>

                <div className="control-group field-stagger">
                  <label className="control-label" htmlFor="password">Password</label>
                  <div className="password-field-wrap">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="control-input"
                      style={{ paddingRight: '44px' }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      autoComplete="current-password"
                      data-testid="password-input"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeSlash size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="portal-action-button btn-stagger" disabled={loading} data-testid="login-button">
                  {loading ? (
                    <>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                        animation: 'spin 0.7s linear infinite'
                      }}></div>
                      Signing in...
                    </>
                  ) : 'Sign In'}
                </button>

                <button type="button" className="portal-utility-link link-stagger" onClick={handleForgotPassword}>
                  Forgot Password?
                </button>
              </form>

              <div className="portal-divider divider-stagger">
                <div className="portal-divider-line"></div>
                <span className="portal-divider-text">OR</span>
                <div className="portal-divider-line"></div>
              </div>

              <button type="button" className="zoho-button zoho-stagger" onClick={handleZohoLogin} data-testid="zoho-login-button">
                Sign in with Zoho
              </button>

              <div className="portal-footer footer-stagger">
                Botree Software © 2026 | Botree Roots
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
