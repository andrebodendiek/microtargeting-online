// Lehrkraft-Anmeldung: gemeinsames Passwort (TEACHER_PASSWORD) -> signiertes, HttpOnly-Cookie
import crypto from 'node:crypto';

const COOKIE = 'bubbl_teacher';
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 Tage angemeldet bleiben

export function createAuth({ password, secret }) {
  const configured = typeof password === 'string' && password.length > 0;
  // Ändert sich das Passwort, werden alle bestehenden Anmeldungen ungültig.
  const key = crypto.createHash('sha256').update(`${secret || ''}|${password || ''}|bubbl`).digest();
  const sign = (v) => crypto.createHmac('sha256', key).update(v).digest('base64url');
  const safeEq = (a, b) => {
    const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
  };

  function parseCookies(header = '') {
    const out = {};
    for (const part of header.split(';')) {
      const i = part.indexOf('=');
      if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
    return out;
  }

  function isTeacher(cookieHeader) {
    if (!configured) return false;
    const v = parseCookies(cookieHeader)[COOKIE];
    if (!v) return false;
    const [exp, sig] = v.split('.');
    if (!exp || !sig || !safeEq(sig, sign(exp))) return false;
    return Number(exp) > Date.now();
  }

  // Passwortvergleich über Hashes (konstante Laufzeit, unabhängig von der Länge)
  function checkPassword(input) {
    if (!configured || typeof input !== 'string') return false;
    const a = crypto.createHash('sha256').update(input).digest();
    const b = crypto.createHash('sha256').update(password).digest();
    return crypto.timingSafeEqual(a, b);
  }

  function cookieFor(secure) {
    const exp = String(Date.now() + MAX_AGE_S * 1000);
    return `${COOKIE}=${exp}.${sign(exp)}; Path=/; Max-Age=${MAX_AGE_S}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
  }
  const clearCookie = (secure) => `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;

  return { configured, isTeacher, checkPassword, cookieFor, clearCookie };
}
