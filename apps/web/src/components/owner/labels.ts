import type { OwnerKey, Translator } from '@/i18n/owner/t';

type LabelGroup = 'status' | 'source' | 'method' | 'orderStatus' | 'taskType' | 'taskStatus' | 'features';

/** Translated label for a value from the API (a status, a channel…); the raw value when there is none. */
export function tLabel(t: Translator, group: LabelGroup, value: string): string {
  const key = `shared.${group}.${value}` as OwnerKey;
  const s = t(key);
  return s === key ? value : s;
}
