import type { Metadata } from 'next';
import { ReviewForm } from '@/components/guest/ReviewForm';
import { siteContext } from '@/lib/site';

/** Per guest (currency cookie, tokens): never cached. */
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ t?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await siteContext();
  return { title: t('review.metaTitle'), robots: { index: false, follow: false } };
}

export default async function ReviewPage({ params, searchParams }: Props) {
  const { reference } = await params;
  await siteContext(); // 404 for unknown sites
  const { t = '' } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <ReviewForm reference={decodeURIComponent(reference)} token={t} />
    </div>
  );
}
