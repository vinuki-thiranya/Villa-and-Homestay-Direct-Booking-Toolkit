/**
 * Submits every WhatsApp message template (src/modules/notifications/templates.ts) in every
 * language to Meta for approval. Needs WHATSAPP_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID.
 *
 *   npm run whatsapp:templates            # submit
 *   npm run whatsapp:templates -- --dry   # print what would be submitted
 *
 * Re-running is safe: templates that already exist are reported and skipped by Meta.
 */
import { fileURLToPath } from 'node:url';
import { META_LANG, TEMPLATES, templateBody } from '../src/modules/notifications/templates.js';

export function buildRequests() {
  return TEMPLATES.flatMap((def) =>
    def.languages.map((lang) => {
      const { text, example } = templateBody(def, lang);
      return {
        name: def.name,
        language: META_LANG[lang],
        category: def.category,
        components: [
          {
            type: 'BODY',
            text,
            ...(example.length ? { example: { body_text: [example] } } : {}),
          },
        ],
      };
    }),
  );
}

async function main() {
  const dry = process.argv.includes('--dry');
  const requests = buildRequests();
  if (dry) {
    for (const r of requests) console.log(`${r.name} [${r.language}] ${r.category}\n  ${r.components[0]!.text}\n`);
    console.log(`${requests.length} template(s)`);
    return;
  }
  const token = process.env.WHATSAPP_TOKEN;
  const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (!token || !waba) throw new Error('Set WHATSAPP_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID');
  for (const r of requests) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${waba}/message_templates`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(r),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; status?: string; error?: { message: string } };
    console.log(`${res.ok ? 'submitted' : 'FAILED   '} ${r.name} [${r.language}] ${res.ok ? body.status ?? '' : body.error?.message ?? res.status}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
