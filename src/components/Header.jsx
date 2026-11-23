'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { resolveAssetUrl } from '@/lib/api';
import SocialNavBadge from '@/components/SocialNavBadge';

const MUTE_STORAGE_KEY = 'cp-chat-sound-muted';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isLoading, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const userMenuRef = useRef(null);
  const isLoggedIn = Boolean(user);

  const navLinks = [
    { href: '/problems', label: 'Problems', prefetch: true },
    { href: '/contest', label: 'Contests', prefetch: true },
    { href: '/leaderboard', label: 'Leaderboard', prefetch: false },
    { href: '/learn', label: 'Learn', prefetch: false },
    { href: '/social', label: 'Social' },
  ];

  // Initialize theme & sound preference on mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('competitive-pirates-theme');
      if (saved === 'dark' || saved === 'light') {
        setIsDark(saved === 'dark');
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDark(true);
      }
      setIsSoundMuted(localStorage.getItem(MUTE_STORAGE_KEY) === 'true');
    } catch {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDark(true);
      }
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('competitive-pirates-theme', isDark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDark, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      try {
        const saved = localStorage.getItem('competitive-pirates-theme');
        if (!saved || (saved !== 'dark' && saved !== 'light')) {
          setIsDark(e.matches);
        }
      } catch {
        setIsDark(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const toggleSoundMute = () => {
    setIsSoundMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Close user menu on outside click or Escape
  useEffect(() => {
    if (!userMenuOpen) return;

    const handleOutsideClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [userMenuOpen]);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0]?.toUpperCase() || 'U';
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-bg-card border-b border-border">
      <div className="max-w-container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Navigation */}
          <div className="flex items-center gap-8">
            <Link
              href="/problems"
              className="flex items-center gap-2 text-navy font-semibold text-body-lg no-underline"
              aria-label="Competitive Pirates home"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="2" x2="12" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="12" y1="2" x2="15.5" y2="15.5" />
              </svg>
              <span className="hidden sm:inline">Competitive Pirates</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={link.prefetch}
                    className={`inline-flex items-center text-small-lg font-medium transition-colors relative no-underline ${active
                      ? 'text-text-primary'
                      : 'text-text-secondary hover:text-text-primary'
                      }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {link.label}
                    {link.href === '/social' && <SocialNavBadge />}
                    {active && (
                      <span
                        className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-navy rounded-full"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Sound toggle + Theme toggle + Auth or User Menu */}
          <div className="flex items-center gap-3">
            {isLoggedIn && mounted && (
              <button
                type="button"
                onClick={toggleSoundMute}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-section transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
                aria-label={isSoundMuted ? 'Unmute chat notifications' : 'Mute chat notifications'}
                title={isSoundMuted ? 'Unmute chat sound' : 'Mute chat sound'}
              >
                {isSoundMuted ? (
                  <svg className="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-section transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {mounted && isDark ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-section transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>

            {/* Auth area */}
            {isLoading ? (
              <div className="w-24 h-9 rounded-lg bg-bg-section" aria-hidden="true" />
            ) : isLoggedIn && user ? (
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-bg-section transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label="User menu"
                >
                  {user.avatarUrl ? (
                    <img
                      src={resolveAssetUrl(user.avatarUrl)}
                      alt={user.username || 'Profile'}
                      className="w-8 h-8 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-white text-sm font-medium"
                      title={user.username || user.email || ''}
                    >
                      {getInitials(user.username || user.email)}
                    </div>
                  )}
                  <svg className="w-4 h-4 hidden sm:block text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-bg-raised border border-border rounded-lg shadow-card py-1 z-30"
                    role="menu"
                    aria-label="User menu"
                  >
                    <div className="px-4 py-2.5 border-b border-border">
                      <p className="text-sm font-medium text-text-primary truncate">
                        @{user.username || 'pirate'}
                      </p>
                      {user.email && (
                        <p className="text-xs text-text-muted truncate mt-0.5">
                          {user.email}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/profile"
                      className="block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-section transition-colors no-underline"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    {user.role === 'SUPERUSER' && (
                      <Link
                        href="/superuser"
                        className="block w-full text-left px-4 py-2 text-sm font-medium text-gold hover:bg-bg-section transition-colors no-underline"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Access Superuser
                      </Link>
                    )}
                    {(user.role === 'ADMIN' || user.role === 'SUPERUSER') && (
                      <>
                        <Link
                          href="/admin/problems"
                          className="block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-section transition-colors no-underline"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Problem Studio
                        </Link>
                        <Link
                          href="/admin/contests"
                          className="block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-section transition-colors no-underline"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Contest Studio
                        </Link>
                      </>
                    )}
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-section transition-colors"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-text-primary border border-border rounded-lg hover:bg-bg-section transition-colors no-underline"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-navy text-white hover:text-white rounded-lg hover:bg-navy-hover transition-colors no-underline"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden py-4 border-t border-border" role="navigation" aria-label="Mobile navigation">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={link.prefetch}
                    className={`flex items-center px-2 py-3 text-body-lg rounded-lg transition-colors no-underline ${active
                      ? 'bg-bg-section text-text-primary font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-section'
                      }`}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={active ? 'page' : undefined}
                  >
                    {link.label}
                    {link.href === '/social' && <SocialNavBadge />}
                  </Link>
                );
              })}
              <hr className="my-3 border-border" />
              {!isLoggedIn ? (
                <div className="flex flex-col gap-2 px-2">
                  <Link
                    href="/login"
                    className="px-4 py-3 text-body-lg text-text-primary border border-border rounded-lg text-center hover:bg-bg-section transition-colors no-underline"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-3 text-body-lg bg-navy text-white hover:text-white rounded-lg text-center hover:bg-navy-hover transition-colors no-underline"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </div>
              ) : (
                <div className="px-2 space-y-1">
                  <div className="px-4 py-2 text-sm text-text-muted">
                    Signed in as <span className="font-medium text-text-primary">@{user?.username}</span>
                  </div>
                  <Link
                    href="/profile"
                    className="block w-full text-left px-4 py-3 text-body-lg text-text-primary hover:bg-bg-section rounded-lg no-underline"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 text-body-lg text-text-primary hover:bg-bg-section rounded-lg"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>

      <style jsx>{`
        .no-underline {
          text-decoration: none !important;
        }
      `}</style>
    </header>
  );
}