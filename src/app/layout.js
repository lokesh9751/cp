import './globals.css';
import AppShell from '@/components/AppShell';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'Competitive Pirates - Practice DSA. Compete. Level up.',
  description: 'Practice DSA and competitive programming problems, join contests, and track your progress.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-bg-page text-text-primary">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}