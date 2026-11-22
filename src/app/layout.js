import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'Competitive Pirates - Practice DSA. Compete. Level up.',
  description: 'Practice DSA and competitive programming problems, join contests, and track your progress.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen flex flex-col bg-bg-page text-text-primary">
        <AuthProvider>
          <Header />
          <main className="flex-1 w-full max-w-container mx-auto px-4 py-8">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}