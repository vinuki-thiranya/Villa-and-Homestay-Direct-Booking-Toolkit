import type { Metadata } from 'next';
import { ReviewForm } from '@/components/guest/ReviewForm';
import { siteContext } from '@/lib/site';

type Props = {
  params: Promise<{ site: string; reference: string }>;
  searchParams: Promise<{ t?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await siteContext((await params).site);
  return { title: t('review.metaTitle'), robots: { index: false, follow: false } };
}

export default async function ReviewPage({ params, searchParams }: Props) {
  const { site, reference } = await params;
  await siteContext(site); // 404 for unknown sites
  const { t = '' } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <ReviewForm reference={decodeURIComponent(reference)} token={t} />
    </div>
  );
}
