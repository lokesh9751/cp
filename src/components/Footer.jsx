'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-bg-card mt-auto">
      <div className="max-w-container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2 text-navy font-semibold text-body-lg no-underline" aria-label="Competitive Pirates home">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="12" y1="2" x2="15.5" y2="15.5" />
            </svg>
            <span>Competitive Pirates</span>
          </Link>

          {/* Center: Navigation links */}
          <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-6" aria-label="Footer navigation">
            <Link href="/" className="text-small text-text-secondary hover:text-text-primary transition-colors no-underline">Problems</Link>
            <Link href="/contests" className="text-small text-text-secondary hover:text-text-primary transition-colors no-underline">Contests</Link>
            <Link href="/leaderboard" className="text-small text-text-secondary hover:text-text-primary transition-colors no-underline">Leaderboard</Link>
            <Link href="/privacy" className="text-small text-text-secondary hover:text-text-primary transition-colors no-underline">Privacy</Link>
            <Link href="/terms" className="text-small text-text-secondary hover:text-text-primary transition-colors no-underline">Terms</Link>
            <Link href="/contact" className="text-small text-text-secondary hover:text-text-primary transition-colors no-underline">Contact</Link>
          </nav>

          {/* Right: Copyright */}
          <p className="text-small text-text-muted">
            © {currentYear} Competitive Pirates
          </p>
        </div>
      </div>

      <style jsx>{`
        .no-underline {
          text-decoration: none !important;
        }
      `}</style>
    </footer>
  );
}