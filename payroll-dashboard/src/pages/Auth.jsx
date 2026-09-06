// src/pages/Auth.jsx
import { useState } from 'react';
import { Button, Input, Select, Badge } from '../components/UI';
import { authenticateUser, registerUser, SEED_USERS } from '../lib/user';

// Helper to format role names cleanly (Title Case, no underscores)
function formatRoleName(role) {
  if (!role) return '';
  const specialNames = {
    ADMIN: 'Admin',
    HR_PAYROLL_MANAGER: 'HR Payroll Manager',
    HR_PAYROLL_USER: 'HR Payroll User',
    HR_MANAGER: 'HR Manager',
    EMPLOYEE: 'Employee',
  };
  if (specialNames[role]) return specialNames[role];
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function AuthPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleRoleSelect = (selectedRole) => {
    handleChange('role', selectedRole);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const session = await authenticateUser({
          email: formData.email,
          password: formData.password,
        });
        onLoginSuccess(session);
      } else {
        if (!formData.name.trim()) throw new Error('Full Name is required');
        const result = await registerUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });
        if (result.pending) {
          setPendingMessage(result.message);
        } else {
          onLoginSuccess(result);
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const activeSeedUser = SEED_USERS.find(u => u.email === formData.email || u.role === formData.role) || SEED_USERS[1];

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Logo Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-ink-900 text-white font-bold text-xl shadow-soft">
            P
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            peoplepay<span className="text-accent-500">360</span>
          </h1>
          <p className="text-xs text-gray-500">
            Enterprise HR, Contracts & Payroll SaaS Platform
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lift border border-black/[0.04]">
          <div className="flex items-center justify-center gap-2 mb-6 border-b border-gray-100 pb-4">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setPendingMessage(''); setFormData({ name: '', email: '', password: '', role: '' }); }}
              className={`pb-1 text-sm font-semibold transition-colors relative ${
                mode === 'login' ? 'text-ink-900 border-b-2 border-ink-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Sign In
            </button>
            <span className="text-gray-300">·</span>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setPendingMessage(''); setFormData({ name: '', email: '', password: '', role: '' }); }}
              className={`pb-1 text-sm font-semibold transition-colors relative ${
                mode === 'register' ? 'text-ink-900 border-b-2 border-ink-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
              <span>{error}</span>
            </div>
          )}

          {pendingMessage ? (
            <div className="text-center space-y-4 py-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink-900">Registration submitted</h3>
                <p className="text-xs text-gray-500 mt-1">{pendingMessage}</p>
              </div>
              <Button
                variant="secondary"
                type="button"
                className="w-full"
                onClick={() => { setMode('login'); setPendingMessage(''); setFormData({ name: '', email: '', password: '', role: '' }); }}
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <Input
                label="Full Name"
                placeholder="Sarah Chen"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            )}

            {/* 1. Work Email */}
            <Input
              label="Work Email"
              type="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />

            {/* 2. Password with See Password Toggle */}
            <div className="w-full">
              <label htmlFor="auth-password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="input pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink-900 p-1 rounded-md transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    /* Eye Slash Icon */
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    /* Eye Icon */
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 3. Role Dropdown — login only; a self-registered account can't choose
                its own role, it always starts as a pending Employee account and
                waits for an Admin to approve it (and assign a role) */}
            {mode === 'login' ? (
              <div>
                <Select
                  label="Role"
                  value={formData.role}
                  onChange={(e) => handleRoleSelect(e.target.value)}
                  options={[
                    { value: '', label: 'Select a role...' },
                    ...SEED_USERS.map((user) => ({
                      value: user.role,
                      label: formatRoleName(user.role),
                    })),
                  ]}
                />
              </div>
            ) : (
              <p className="text-xs text-gray-500 -mt-1">
                New accounts start as an Employee and require Admin approval before you can sign in.
              </p>
            )}

            <Button
              variant="dark"
              type="submit"
              className="w-full py-2.5 mt-2"
              loading={loading}
            >
              {mode === 'login' ? 'Sign In to Dashboard' : 'Create Account'}
            </Button>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
