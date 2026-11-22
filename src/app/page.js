import { Suspense } from 'react';
import UpcomingContests from '@/components/UpcomingContests';
import PracticeQuestions from '@/components/PracticeQuestions';

export const metadata = {
  title: 'Practice Problems - Competitive Pirates',
  description: 'Practice DSA and competitive programming problems with filters, search, and pagination.',
};

export default function ProblemsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-44 bg-bg-card border border-border rounded-lg" />
            <div className="h-44 bg-bg-card border border-border rounded-lg" />
            <div className="h-44 bg-bg-card border border-border rounded-lg" />
          </div>
          <div className="h-64 bg-bg-card border border-border rounded-lg" />
        </div>
      }
    >
      <UpcomingContests />
      <PracticeQuestions />
    </Suspense>
  );
}