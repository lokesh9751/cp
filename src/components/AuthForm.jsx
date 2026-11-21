'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AuthForm({ mode = 'login' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const isSignup = mode === 'signup';
  const title = isSignup ? 'Create account' : 'Log in';
  const submitText = isSignup ? 'Sign up' : 'Log in';
  const alternateHref = isSignup ? '/login' : '/signup';
  const alternateText = isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Placeholder auth - no real authentication
    await new Promise(resolve => setTimeout(resolve, 500));
    alert(`${submitText} submitted - this is a placeholder action`);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-bg-card border border-border rounded-lg p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-text-primary mb-6">{title}</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                Email address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent transition-shadow"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent transition-shadow"
                placeholder="••••••••"
              />
            </div>

            {/* Remember me (login only) */}
            {isSignup && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 border border-border rounded bg-bg-input focus:ring-2 focus:ring-navy"
                  />
                  <span className="text-small text-text-secondary">Remember me</span>
                </label>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 text-small font-medium text-navy bg-navy rounded-lg hover:bg-navy-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 focus:ring-offset-bg-card"
            >
              {submitText}
            </button>
          </form>

          {/* Alternate link */}
          <div className="mt-6 text-center text-sm text-text-secondary">
            {alternateText}{' '}
            <Link
              href={alternateHref}
              className="font-medium text-navy hover:text-navy-hover no-underline"
            >
              {alternateText.split(' ').pop()}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}