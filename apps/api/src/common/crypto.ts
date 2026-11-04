import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from 'node:crypto';

function key(secret: string): Buffer {
  if (!secret) {
    // Dev fallback so a fresh checkout runs; production refuses to boot without ENCRYPTION_KEY (config.ts).
    return createHash('sha256').update('staydirect-dev-only-key').digest();
  }
  const buf = Buffer.from(secret, 'base64');
  if (buf.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes, base64-encoded');
  return buf;
}

/** AES-256-GCM. Output: base64(iv | tag | ciphertext). */
export function encryptJson(value: unknown, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}

export function decryptJson<T>(payload: string, secret: string): T {
  const buf = Buffer.from(payload, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key(secret), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  const pt = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]);
  return JSON.parse(pt.toString('utf8')) as T;
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function md5Upper(s: string): string {
  return createHash('md5').update(s).digest('hex').toUpperCase();
}

export function otpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

// No 0/O/1/I to keep references readable over the phone.
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function bookingReference(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[randomInt(0, REF_ALPHABET.length)];
  return `SD-${s}`;
}
