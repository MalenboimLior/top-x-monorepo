const HASH_SECRET = import.meta.env.VITE_TRIVIA_HASH_SECRET as string | undefined;

export function getHashSecret(): string | undefined {
  return HASH_SECRET?.trim() || undefined;
}

export function hasHashSecret(): boolean {
  return Boolean(getHashSecret());
}

export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function ensureSalt(existing?: string | null): string {
  const trimmed = existing?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : generateSalt();
}

export async function computeAnswerHash(questionId: string, answerText: string, salt?: string): Promise<string> {
  const secret = getHashSecret();
  if (!secret) {
    throw new Error('VITE_TRIVIA_HASH_SECRET is not configured');
  }

  const payload = `${questionId}|${answerText}|${salt ?? ''}`;
  const encoder = new TextEncoder();
  const msgBuffer = encoder.encode(payload);
  const keyBuffer = encoder.encode(secret);

  const key = await crypto.subtle.importKey('raw', keyBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const hashBuffer = await crypto.subtle.sign('HMAC', key, msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

