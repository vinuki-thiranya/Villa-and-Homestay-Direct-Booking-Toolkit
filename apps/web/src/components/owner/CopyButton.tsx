'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useT } from './I18n';

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const t = useT();
  return (
    <button
      type="button"
      className="btn-secondary min-h-9 shrink-0 px-3"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
    >
      {done ? <Check aria-hidden className="h-4 w-4 text-ok" /> : <Copy aria-hidden className="h-4 w-4" />}
      <span aria-live="polite">{done ? t('shared.copied') : (label ?? t('shared.copy'))}</span>
    </button>
  );
}
