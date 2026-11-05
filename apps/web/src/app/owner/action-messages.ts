// Translated result and error messages for the owner server actions (not a server-action module itself).
import type { OwnerKey } from '@/i18n/owner/t';
import { ApiError } from '@/lib/api';
import { getT } from '@/lib/owner-i18n';

type Vars = Record<string, string | number>;

/** The message for a key, in the owner's language. */
export async function msg(key: OwnerKey, vars?: Vars): Promise<string> {
  return (await getT())(key, vars);
}

/**
 * A form error in the owner's language for the common cases (gone, signed out, rate-limited); other
 * API errors keep the API's own explanation, which is specific to the request.
 */
export async function errorMsg(err: unknown): Promise<string> {
  const t = await getT();
  if (err instanceof ApiError) {
    if (err.status === 404) return t('actions.notFound');
    if (err.status === 401) return t('actions.sessionExpired');
    if (err.status === 429) return t('actions.tooManyCodes');
  }
  return err instanceof Error ? err.message : t('actions.somethingWrong');
}
