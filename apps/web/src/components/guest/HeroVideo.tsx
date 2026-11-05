'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useGT } from './GuestI18n';

type NetworkInfo = { saveData?: boolean; effectiveType?: string };

/**
 * The looping hero video, layered over the poster photo once the page has finished loading and the
 * browser is idle. Skipped for reduced motion, Save-Data and 2G: the poster stays. A pause button
 * stops it (WCAG 2.2.2).
 */
export function HeroVideo({ src }: { src: string }) {
  const [load, setLoad] = useState(false);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const t = useGT();

  useEffect(() => {
    const net = (navigator as Navigator & { connection?: NetworkInfo }).connection;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || net?.saveData || /(^|-)2g$/.test(net?.effectiveType ?? '')) return;
    let idle = 0;
    const start = () => {
      const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
      idle = ric(() => setLoad(true)) as number;
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      window.cancelIdleCallback?.(idle);
    };
  }, []);

  if (!load) return null;

  function toggle() {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  }

  return (
    <>
      <video
        ref={video}
        src={src}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        aria-hidden
        tabIndex={-1}
        onPlaying={() => setVisible(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />
      {visible && (
        <button
          type="button"
          onClick={toggle}
          className="absolute bottom-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/60"
          aria-label={paused ? t('home.videoPlay') : t('home.videoPause')}
        >
          {paused ? <Play aria-hidden className="h-4 w-4" /> : <Pause aria-hidden className="h-4 w-4" />}
        </button>
      )}
    </>
  );
}
