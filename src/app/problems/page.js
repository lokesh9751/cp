import { Suspense } from 'react';
import UpcomingContests from '@/components/UpcomingContests';
import PracticeQuestions from '@/components/PracticeQuestions';
import { mockQuestions } from '@/lib/mockData';
import { contests } from '@/data/contests';

export const metadata = {
  title: 'Practice Problems - Competitive Pirates',
  description: 'Practice DSA and competitive programming problems with filters, search, and pagination.',
};

// Client wrapper for PracticeQuestions (needs useSearchParams)
function PracticeQuestionsWrapper({ questions }) {
  return <PracticeQuestions questions={questions} />;
}

export default function ProblemsPage() {
  return (
    <>
      <UpcomingContests contests={contests} />
      <Suspense fallback={<div>Loading problems...</div>}>
        <PracticeQuestionsWrapper questions={mockQuestions} />
      </Suspense>
    </>
  );
}