import Link from 'next/link';
import Logo from '@/components/Logo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-bg-card mt-auto">
      <div className="max-w-container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link
            href="/problems"
            className="flex items-center gap-2 text-navy font-semibold text-body-lg no-underline"
            aria-label="Competitive Pirates home"
          >
            <Logo className="w-8 h-8 shrink-0" />
            <span>Competitive Pirates</span>
          </Link>

          <nav
            className="flex flex-wrap items-center justify-center gap-4 md:gap-6"
            aria-label="Footer navigation"
          >
            <Link href="/problems" className="text-small text-text-secondary hover:text-text-primary transition-colors no-underline">
              Problems
            </Link>
            <Link href="/contest" className="text-small text-text-secondary hover:text-text-primary transition-colors no-underline">
              Contests
            </Link>
            <Link href="/leaderboard" prefetch={false} className="text-small text-text-secondary hover:text-text-primary transition-colors no-underline">
              Leaderboard
            </Link>
            <Link href="/learn" prefetch={false} className="text-small text-text-secondary hover:text-text-primary transition-colors no-underline">
              Learn
            </Link>
            <Link href="/privacy" prefetch={false} className="text-small text-text-secondary hover:text-text-primary transition-colors no-underline">
              Privacy
            </Link>
            <Link href="/terms" prefetch={false} className="text-small text-text-secondary hover:text-text-primary transition-colors no-underline">
              Terms
            </Link>
            <Link href="/contact" prefetch={false} className="text-small text-text-secondary hover:text-text-primary transition-colors no-underline">
              Contact
            </Link>
          </nav>

          <p className="text-small text-text-muted">
            © {currentYear} Competitive Pirates
          </p>
        </div>
      </div>
    </footer>
  );
}