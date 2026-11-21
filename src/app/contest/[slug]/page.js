import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ContestDetail from '@/components/ContestDetail';
import { getContestBySlug, getAllContestSlugs, getDemoNow } from '@/data/contests';

export async function generateStaticParams() {
  const slugs = getAllContestSlugs();
  return slugs.map(slug => ({ slug }));
}

export async function generateMetadata({ params }) {
  const contest = getContestBySlug(params.slug);
  if (!contest) {
    return { title: 'Contest Not Found - Competitive Pirates' };
  }
  return {
    title: `${contest.title} - Competitive Pirates`,
    description: contest.description.overview,
  };
}

export default function ContestDetailPage({ params }) {
  const contest = getContestBySlug(params.slug);
  if (!contest) {
    notFound();
  }

  return <ContestDetail contest={contest} />;
}