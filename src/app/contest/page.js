import { Metadata } from 'next';
import ContestsOverview from '@/components/ContestsOverview';
import { getUpcomingContests, getOngoingContests, getDemoNow } from '@/data/contests';

export const metadata = {
  title: 'Contests - Competitive Pirates',
  description: 'Upcoming and ongoing coding contests. Register and compete.',
};

export default function ContestPage() {
  const now = getDemoNow();
  const upcoming = getUpcomingContests(now);
  const ongoing = getOngoingContests(now);

  return <ContestsOverview upcoming={upcoming} ongoing={ongoing} />;
}