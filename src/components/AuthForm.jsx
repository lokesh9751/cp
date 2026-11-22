'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const PASSWORD_MAX_BYTES = 72;

function validatePasswordBytes(password) {
  return new TextEncoder().encode(password).length <= PASSWORD_MAX_BYTES;
}

function getFieldError(fieldErrors, field) {
  const val = fieldErrors?.[field];
  if (!val) return '';
  return Array.isArray(val) ? val[0] : String(val);
}

export default function AuthForm({ mode = 'login' }) {
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const router = useRouter();
  const { login, signup } = useAuth();

  const isSignup = mode === 'signup';
  const title = isSignup ? 'Create account' : 'Log in';
  const submitText = isSignup ? 'Sign up' : 'Log in';
  const alternateHref = isSignup ? '/login' : '/signup';

  const usernameValid =
    username.length >= 3 &&
    username.length <= 20 &&
    /^[a-z0-9_]+$/.test(username);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());

  const passwordValid =
    password.length >= 8 &&
    password.length <= 100 &&
    validatePasswordBytes(password);

  const allRequirementsMet = isSignup
    ? usernameValid && emailValid && passwordValid
    : Boolean(identifier.trim() && password);

  useEffect(() => {
    setError('');
    setFieldErrors({});
  }, [identifier, username, password, isSignup]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setFieldErrors({});

    try {
      if (isSignup) {
        await signup({
          username: username.trim().toLowerCase(),
          email: identifier.trim().toLowerCase(),
          password,
        });
      } else {
        await login({
          identifier: identifier.trim(),
          password,
        });
      }
      router.push('/problems');
    } catch (err) {
      if (err?.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      }
      setError(err?.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCheck = (met, label) => (
    <li className="flex items-center gap-2 text-xs">
      <span
        className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${met ? 'bg-success text-white' : 'bg-border-strong text-transparent'
          }`}
      >
        <svg
          className="w-2.5 h-2.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className={met ? 'text-success font-medium' : 'text-text-muted'}>
        {label}
      </span>
    </li>
  );

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-bg-page flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-bg-card border border-border rounded-lg p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-text-primary mb-6">{title}</h1>

          {isSignup && (
            <div className="mb-5 p-3.5 bg-bg-section border border-border rounded-lg">
              <p className="text-xs font-medium text-text-secondary mb-2">
                Account requirements
              </p>
              <ul className="space-y-1.5">
                {renderCheck(
                  usernameValid,
                  'Username: 3–20 chars (lowercase letters, numbers, underscores)'
                )}
                {renderCheck(emailValid, 'Email: valid email address')}
                {renderCheck(passwordValid, 'Password: at least 8 characters')}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-text-primary mb-1.5"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className={`w-full px-3.5 py-2 text-sm border rounded-lg bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-navy ${getFieldError(fieldErrors, 'username')
                      ? 'border-red-500'
                      : 'border-border'
                    }`}
                  placeholder="jack_sparrow"
                />
                {getFieldError(fieldErrors, 'username') && (
                  <p className="mt-1 text-xs text-error">
                    {getFieldError(fieldErrors, 'username')}
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="identifier"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                {isSignup ? 'Email address' : 'Email or username'}
              </label>
              <input
                type={isSignup ? 'email' : 'text'}
                id="identifier"
                name="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete={isSignup ? 'email' : 'username'}
                className={`w-full px-3.5 py-2 text-sm border rounded-lg bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-navy ${getFieldError(fieldErrors, 'email') ||
                    getFieldError(fieldErrors, 'identifier')
                    ? 'border-red-500'
                    : 'border-border'
                  }`}
                placeholder={
                  isSignup ? 'you@example.com' : 'you@example.com or username'
                }
              />
              {(getFieldError(fieldErrors, 'email') ||
                getFieldError(fieldErrors, 'identifier')) && (
                  <p className="mt-1 text-xs text-error">
                    {getFieldError(fieldErrors, 'email') ||
                      getFieldError(fieldErrors, 'identifier')}
                  </p>
                )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-primary mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  className={`w-full px-3.5 py-2 pr-11 text-sm border rounded-lg bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-navy ${getFieldError(fieldErrors, 'password')
                      ? 'border-red-500'
                      : 'border-border'
                    }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                >
                  {passwordVisible ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {getFieldError(fieldErrors, 'password') && (
                <p className="mt-1 text-xs text-error">
                  {getFieldError(fieldErrors, 'password')}
                </p>
              )}
            </div>

            {error && Object.keys(fieldErrors).length === 0 && (
              <div className="p-3 text-sm text-error bg-error-bg border border-border rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !allRequirementsMet}
              className="w-full py-2.5 px-4 text-sm font-medium text-white hover:text-white bg-navy rounded-lg hover:bg-navy-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? isSignup
                  ? 'Creating account...'
                  : 'Logging in...'
                : submitText}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-secondary">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <Link
              href={alternateHref}
              className="font-medium text-navy hover:underline"
            >
              {isSignup ? 'Log in' : 'Sign up'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}