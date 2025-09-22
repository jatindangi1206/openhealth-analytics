import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('participant-1');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) throw new Error('Invalid credentials');
      
      const json = await res.json();
      const token = json.token;
      
      if (!token) throw new Error('No token returned');
      
      onLogin(token);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ isVisible }) => (
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      className="eye-icon"
    >
      {isVisible ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </>
      )}
    </svg>
  );

  const LoadingSpinner = () => (
    <svg 
      className="loading-spinner" 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
        <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
        <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
      </circle>
    </svg>
  );

  return (
    <div className="login-container">
      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fafbfc 0%, #ffffff 50%, #f5f7fa 100%);
          padding: 2rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .login-card {
          background: linear-gradient(145deg, #ffffff 0%, #fafbfc 100%);
          border-radius: 1.5rem;
          box-shadow: 
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          padding: 3rem 2.5rem;
          width: 100%;
          max-width: 420px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          position: relative;
          overflow: hidden;
        }

        .login-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #d52b1e 0%, #ff5252 50%, #d52b1e 100%);
        }

        .login-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .login-logo {
          width: 64px;
          height: 64px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, #d52b1e 0%, #b71c1c 100%);
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          box-shadow: 0 8px 16px rgba(213, 43, 30, 0.3);
          position: relative;
        }

        .login-logo::after {
          content: '';
          position: absolute;
          inset: 2px;
          border-radius: 0.75rem;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%);
        }

        .login-title {
          font-size: 2rem;
          font-weight: 800;
          color: #d52b1e;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #d52b1e 0%, #b71c1c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-subtitle {
          color: #6b7280;
          font-size: 1rem;
          font-weight: 400;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          letter-spacing: 0.025em;
          text-transform: uppercase;
        }

        .input-wrapper {
          position: relative;
        }

        .form-input {
          width: 100%;
          padding: 1rem 1.25rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          font-size: 1rem;
          background: linear-gradient(145deg, #ffffff 0%, #fafbfc 100%);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
          font-family: inherit;
        }

        .form-input:focus {
          border-color: #d52b1e;
          box-shadow: 
            0 0 0 3px rgba(213, 43, 30, 0.1),
            0 4px 6px -1px rgba(0, 0, 0, 0.1);
          background: #ffffff;
          transform: translateY(-1px);
        }

        .form-input::placeholder {
          color: #9ca3af;
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          transition: color 0.2s;
          padding: 0.25rem;
          border-radius: 0.25rem;
        }

        .password-toggle:hover {
          color: #d52b1e;
        }

        .eye-icon {
          transition: transform 0.2s;
        }

        .password-toggle:hover .eye-icon {
          transform: scale(1.1);
        }

        .login-button {
          width: 100%;
          background: linear-gradient(135deg, #d52b1e 0%, #b71c1c 100%);
          color: white;
          border: none;
          border-radius: 0.75rem;
          padding: 1rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 6px -1px rgba(213, 43, 30, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          font-family: inherit;
          letter-spacing: 0.025em;
        }

        .login-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #b71c1c 0%, #8b0000 100%);
          box-shadow: 0 6px 8px -1px rgba(213, 43, 30, 0.4);
          transform: translateY(-2px);
        }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .loading-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .error-message {
          background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
          border: 1px solid #fecaca;
          border-left: 4px solid #ef4444;
          color: #dc2626;
          padding: 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .error-icon {
          flex-shrink: 0;
          width: 16px;
          height: 16px;
        }

        .divider {
          margin: 2rem 0 1rem;
          text-align: center;
          position: relative;
        }

        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%);
        }

        .divider-text {
          background: #ffffff;
          padding: 0 1rem;
          color: #9ca3af;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .demo-info {
          background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%);
          border: 1px solid #bae6fd;
          border-left: 4px solid #0ea5e9;
          color: #0369a1;
          padding: 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }

        .demo-info strong {
          display: block;
          margin-bottom: 0.5rem;
          color: #0c4a6e;
        }

        @media (max-width: 480px) {
          .login-container {
            padding: 1rem;
          }
          
          .login-card {
            padding: 2rem 1.5rem;
          }
          
          .login-title {
            font-size: 1.75rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">CH</div>
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to your account to continue</p>
        </div>

        <div>
          <div className="form-group">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon isVisible={showPassword} />
              </button>
            </div>
          </div>

          <button 
            type="button" 
            className="login-button"
            disabled={loading}
            onClick={submit}
            aria-describedby={error ? 'error-message' : undefined}
          >
            {loading ? (
              <>
                <LoadingSpinner />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {error && (
            <div id="error-message" className="error-message" role="alert">
              <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
        </div>

        <div className="divider">
          <span className="divider-text">Demo Account</span>
        </div>

        <div className="demo-info">
          <strong>Demo Credentials:</strong>
          Username: participant-1<br />
          Password: password123
        </div>
      </div>
    </div>
  );
}