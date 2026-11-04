import { TranslationsEditor } from '@/components/admin/TranslationsEditor';
import { adminApi, type TranslationRow } from '@/lib/admin';

export const metadata = { title: 'Translations' };

export default async function TranslationsPage() {
  const rows = await adminApi<TranslationRow[]>('/admin/translations');
  return (
    <>
      <header className="adm-head">
        <div>
          <h1>Translations</h1>
          <p>
            Guest emails and messages in English, German, French and Hindi. A change here replaces the built-in text for every property. Words in
            braces, like {'{property}'}, are filled in automatically: keep them.
          </p>
        </div>
      </header>
      <TranslationsEditor rows={rows} />
    </>
  );
}
