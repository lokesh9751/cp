import { Suspense } from 'react';
import ProblemDetailPage from '@/components/ProblemDetailPage';

export const metadata = {
  title: 'Problem - Competitive Pirates',
};

export default function ProblemPage({ params }) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading problem...</div>}>
      <ProblemDetailPage slug={params.slug} />
    </Suspense>
  );
}