'use client';

import { LazyMotion, MotionConfig } from 'motion/react';

const features = () => import('@/lib/motion-features').then((r) => r.default);

/** Motion for one interactive island: features load lazily and the OS reduced-motion setting wins. */
export function GuestMotion({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={features} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
