import React, { useState } from 'react';
import { api } from '../services/api';
import PasswordField from './PasswordField';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const performLogin = async (cleanUsername, cleanPassword) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.auth.login(cleanUsername, cleanPassword);
      onLogin(data);
    } catch (err) {
      setError(err.message || 'Cannot connect to authentication server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;
    performLogin(username.trim().toLowerCase(), password.trim());
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <img src="/logo1.png" alt="Project Management Logo" className="login-logo-img" />
          <h2>Project Management </h2>
          <p>Sign in</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert-banner danger" style={{ justifyContent: 'center', textAlign: 'center' }}>
              {error}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="loginUsername">Username</label>
            <input
              type="text"
              id="loginUsername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="loginPassword">Password</label>
            <PasswordField
              id="loginPassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              disabled={isLoading}
            />
          </div>
          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
