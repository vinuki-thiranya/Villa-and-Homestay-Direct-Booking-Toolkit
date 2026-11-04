import { Star } from 'lucide-react';

/** Read-only star rating (works on owner and guest pages). */
export function Stars({ rating, size = 'h-4 w-4' }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={`${size} ${n <= rating ? 'fill-accent text-accent' : 'text-line'}`} />
      ))}
    </span>
  );
}
