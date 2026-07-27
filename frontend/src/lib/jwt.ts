/**
 * Разбор JWT без верификации подписи — только чтобы прочитать claims на клиенте
 * (роль, email, срок жизни). Доверять этому нельзя, проверка всё равно на бэке.
 */

const CLAIM_ROLE =
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
const CLAIM_EMAIL =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";
const CLAIM_NAME_ID =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";

export interface JwtClaims {
  userId?: string;
  email?: string;
  role?: string;
  /** exp в миллисекундах */
  expiresAt?: number;
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  // Корректно достаём UTF-8 (email/имена могут быть не-ASCII)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeJwt(token: string): JwtClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as Record<string, unknown>;
    return {
      // JwtTokenGenerator кладёт claims через ClaimTypes.*, поэтому имена длинные
      userId: (payload[CLAIM_NAME_ID] ?? payload.nameid ?? payload.sub) as string | undefined,
      email: (payload[CLAIM_EMAIL] ?? payload.email) as string | undefined,
      role: (payload[CLAIM_ROLE] ?? payload.role) as string | undefined,
      expiresAt: typeof payload.exp === "number" ? payload.exp * 1000 : undefined,
    };
  } catch {
    return null;
  }
}

/** Токен живёт 60 минут (JwtTokenGenerator), refresh-токена нет — см. REVIEW.md п.9 */
export function isExpired(token: string): boolean {
  const claims = decodeJwt(token);
  if (!claims?.expiresAt) return false;
  return Date.now() >= claims.expiresAt;
}
