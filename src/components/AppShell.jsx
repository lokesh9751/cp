'use client';

import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AppShell({ children }) {
  const pathname = usePathname();
  const isProblemIde = pathname?.startsWith('/problem/');

  if (isProblemIde) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-bg-page text-text-primary">
        <Header />
        <main className="flex-1 min-h-0 w-full overflow-hidden">
          {children}
        </main>
        <Toaster position="bottom-right" richColors closeButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-page text-text-primary">
      <Header />
      <main className="flex-1 w-full max-w-container mx-auto px-4 py-8">
        {children}
      </main>
      <Footer />
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
