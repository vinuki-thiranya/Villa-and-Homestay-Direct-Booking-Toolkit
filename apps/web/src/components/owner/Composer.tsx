'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Send, Zap } from 'lucide-react';
import { sendMessageAction } from '@/app/owner/actions-r2';
import type { QuickReply } from '@/lib/owner-types';

/**
 * Reply box with a quick-reply picker. WhatsApp only allows free text within 24 hours of the
 * guest's last message, so outside that window the box is disabled with the reason.
 */
export function Composer({ conversationId, windowOpen, quickReplies }: { conversationId: string; windowOpen: boolean; quickReplies: QuickReply[] }) {
  const [state, action, pending] = useActionState(sendMessageAction.bind(null, conversationId), null);
  const [text, setText] = useState('');
  const [picking, setPicking] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state?.ok) setText('');
  }, [state]);

  if (!windowOpen) {
    return (
      <p className="card p-4 text-sm text-muted" role="note">
        The 24-hour WhatsApp window has closed, so free-text replies are blocked by WhatsApp. When the guest writes again you can reply here;
        until then automated messages (approved templates) still reach them, or call them directly.
      </p>
    );
  }

  return (
    <form action={action} className="card sticky bottom-20 space-y-2 p-3 md:bottom-4">
      {picking && (
        <div className="max-h-64 overflow-y-auto rounded-xl border border-line">
          {quickReplies.length === 0 ? (
            <p className="p-3 text-sm text-muted">No quick replies yet — load the defaults under Setup → Concierge.</p>
          ) : (
            <ul className="divide-y divide-line">
              {quickReplies.map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-surface-2"
                    onClick={() => {
                      setText(q.body);
                      setPicking(false);
                      box.current?.focus();
                    }}
                  >
                    <span className="font-medium">{q.title}</span>
                    <span className="block truncate text-muted">{q.body}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <label htmlFor="reply" className="sr-only">
        Reply
      </label>
      <textarea
        ref={box}
        id="reply"
        name="body"
        rows={3}
        required
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a reply…"
        className="field py-2"
      />
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary min-h-10 px-3" aria-expanded={picking} onClick={() => setPicking((p) => !p)}>
          <Zap aria-hidden className="h-4 w-4" /> Quick replies
        </button>
        {state?.message && !state.ok && (
          <p role="alert" className="text-sm text-bad">
            {state.message}
          </p>
        )}
        <button type="submit" className="btn-primary ml-auto min-h-10 px-4" disabled={pending || !text.trim()}>
          <Send aria-hidden className="h-4 w-4" /> {pending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  );
}
