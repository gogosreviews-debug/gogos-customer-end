import { getAccessToken } from './auth-storage';

/**
 * Decode a JWT payload without verifying the signature.
 * Returns null if the token is missing or malformed.
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url → Base64 → JSON
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Returns the `role` field from the stored access token payload,
 * or null if unavailable.
 */
export async function getLoggedInRole(): Promise<number | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return payload?.role ?? null;
}
