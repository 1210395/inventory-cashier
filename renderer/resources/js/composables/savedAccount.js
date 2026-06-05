// Remembers the last account that logged in on this terminal so it can sign
// back in with just the device PIN (no re-typing email/password every shift).
// Consistent with the existing posture where the auth token already lives in
// localStorage on this trusted kiosk device; the password is base64-obfuscated.
import { durableSet, durableDelete } from './durable.js';

const EMAIL_KEY = 'cashier_acct_email';
const PW_KEY = 'cashier_acct_pw';
const NAME_KEY = 'cashier_acct_name';

const enc = (s) => btoa(unescape(encodeURIComponent(s)));
const dec = (s) => decodeURIComponent(escape(atob(s)));

export function saveAccount(email, password, name) {
  const pw = enc(password);
  localStorage.setItem(EMAIL_KEY, email);
  localStorage.setItem(PW_KEY, pw);
  durableSet(EMAIL_KEY, email);
  durableSet(PW_KEY, pw);
  if (name) { localStorage.setItem(NAME_KEY, name); durableSet(NAME_KEY, name); }
}

export function getSavedAccount() {
  const email = localStorage.getItem(EMAIL_KEY);
  const pw = localStorage.getItem(PW_KEY);
  if (!email || !pw) return null;
  try {
    return { email, password: dec(pw), name: localStorage.getItem(NAME_KEY) || '' };
  } catch {
    return null;
  }
}

export function clearSavedAccount() {
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(PW_KEY);
  localStorage.removeItem(NAME_KEY);
  durableDelete(EMAIL_KEY);
  durableDelete(PW_KEY);
  durableDelete(NAME_KEY);
}
