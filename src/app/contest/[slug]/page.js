import ContestDetail from '@/components/ContestDetail';

export const metadata = {
  title: 'Contest Details - Competitive Pirates',
  description: 'View contest schedule, rules, registration status, and reactions.',
};

export default async function ContestDetailPage({ params }) {
  const resolvedParams = await params;
  return <ContestDetail slug={resolvedParams.slug} />;
}