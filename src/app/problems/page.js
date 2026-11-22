import { Suspense } from 'react';
import UpcomingContests from '@/components/UpcomingContests';
import PracticeQuestions from '@/components/PracticeQuestions';
import { getContests } from '@/lib/api';
import { getContestBySlug, getAllContestSlugs } from '@/data/contests';

export const metadata = {
  title: 'Practice Problems - Competitive Pirates',
  description: 'Practice DSA and competitive programming problems with filters, search, and pagination.',
};

export async function generateStaticParams() {
  const slugs = getAllContestSlugs();
  return slugs.map(slug => ({ slug })).slice(0, 10);
}

async function getServerContests() {
  try {
    const data = await getContests(null);
    return data;
  } catch (e) {
    return { ongoing: [], upcoming: [] };
  }
}

// Client wrapper for PracticeQuestions (needs useSearchParams)
function PracticeQuestionsWrapper({ problems, topics, pagination }) {
  return <PracticeQuestions problems={problems} topics={topics} pagination={pagination} />;
}

export default async function ProblemsPage() {
  const contestsData = await getServerContests();
  const ongoing = contestsData.ongoing || [];
  const upcoming = contestsData.upcoming || [];

  return (
    <Suspense fallback={
      <>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-border-strong rounded w-1/3" />
          <div className="h-10 bg-border-strong rounded" />
        </div>
        <div className="animate-pulse space-y-2 h-48 bg-border-strong rounded" />
      </>
    }>
      <UpcomingContests ongoing={ongoing} upcoming={upcoming} />
      <PracticeQuestionsWrapper problems={[]} topics={[]} pagination={{}} />
    </Suspense>
  );
}