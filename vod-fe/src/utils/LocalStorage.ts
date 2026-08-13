// Cookie-backed access token utilities

type CookieOptions = {
  maxAge?: number | null;
  path?: string;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None" | string;
  domain?: string;
};

const TOKEN_COOKIE_NAME = "access_token";
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function isBrowser(): boolean {
  return typeof document !== "undefined" && typeof window !== "undefined";
}

function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (!isBrowser()) return;

  const {
    maxAge = DEFAULT_MAX_AGE_SECONDS,
    path = "/",
    secure = window.location.protocol === "https:",
    sameSite = "Strict",
    domain,
  } = options;

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  if (maxAge != null) cookie += `; Max-Age=${maxAge}`;
  if (path) cookie += `; Path=${path}`;
  if (domain) cookie += `; Domain=${domain}`;
  if (secure) cookie += "; Secure";
  if (sameSite) cookie += `; SameSite=${sameSite}`;

  document.cookie = cookie;
}

function getCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split("=");
    if (decodeURIComponent(key) === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

function deleteCookie(name: string, options: Pick<CookieOptions, "path" | "domain"> = {}): void {
  if (!isBrowser()) return;
  const { path = "/", domain } = options;
  let cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=${path}`;
  if (domain) cookie += `; Domain=${domain}`;
  document.cookie = cookie;
}

const accessToken = {
  addAccessToken(token: string, options: CookieOptions = {}) {
    if (!token) return;
    setCookie(TOKEN_COOKIE_NAME, token, options);
  },
  getAccessToken(): string | null {
    return getCookie(TOKEN_COOKIE_NAME);
  },
  removeAccessToken(options: Pick<CookieOptions, "path" | "domain"> = {}) {
    deleteCookie(TOKEN_COOKIE_NAME, options);
  },
};

export default accessToken;










