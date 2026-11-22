import ProblemDetailPage from '@/components/ProblemDetailPage';

export const metadata = {
  title: 'Problem - Competitive Pirates',
};

export async function generateStaticParams() {
  // Return empty array - we'll use fallback: true for dynamic routes
  return [];
}

export default function ProblemPage({ params }) {
  return <ProblemDetailPage slug={params.slug} />;
}