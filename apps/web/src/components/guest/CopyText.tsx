'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Small copy-to-clipboard button for guest pages (Wi-Fi password, codes). */
export function CopyText({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary min-h-10 px-4"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          // clipboard blocked (old browser / insecure context): the text is visible anyway
        }
      }}
    >
      {done ? <Check aria-hidden className="h-4 w-4 text-ok" /> : <Copy aria-hidden className="h-4 w-4" />}
      <span aria-live="polite">{done ? copiedLabel : label}</span>
    </button>
  );
}
