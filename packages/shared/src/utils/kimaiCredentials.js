/**
 * Per-user Kimai (time tracking) credentials, stored client-side.
 *
 * Kimai has no OIDC/Azure-AD integration for its API (its web login can use
 * SAML SSO, but that's a browser session cookie the API firewall doesn't
 * accept), so each Orion user connects their own Kimai API Token once
 * (generated under Kimai Profile -> API Access -> "+ Create") so timesheets
 * are attributed to the right person. Orion has no backend per-user
 * preference store, so this is kept in localStorage, keyed by Orion userName
 * so multiple users on a shared browser profile don't clobber each other.
 */

// v2: token-only (Kimai API Token / Bearer auth). v1 stored a deprecated
// username+API-password pair (X-AUTH-USER/X-AUTH-TOKEN) - different key so
// any stale v1 entries are never misread as a valid Bearer token.
const STORAGE_KEY = "kimai_credentials_v2";

const readAll = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeAll = (all) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
};

/** Get { token } for the given Orion userName, or null if not connected. */
export const getKimaiCredentials = (userName) => {
  if (!userName) return null;
  const entry = readAll()[userName];
  if (!entry || !entry.token) return null;
  return entry;
};

/** Save { token } for the given Orion userName. */
export const saveKimaiCredentials = (userName, { token }) => {
  if (!userName || !token) return false;
  const all = readAll();
  all[userName] = { token };
  return writeAll(all);
};

/** Whether the given Orion userName has connected a Kimai account. */
export const hasKimaiCredentials = (userName) => getKimaiCredentials(userName) !== null;

/** Remove stored Kimai credentials for the given Orion userName. */
export const clearKimaiCredentials = (userName) => {
  if (!userName) return false;
  const all = readAll();
  if (!(userName in all)) return true;
  delete all[userName];
  return writeAll(all);
};
