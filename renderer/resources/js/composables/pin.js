// Shared cashier terminal-PIN logic, used by both the lock overlay (PinLock)
// and the Settings page so they never drift. The PIN is a 4-digit code stored
// locally on the device as a SHA-256 hash (never in plain text).
import { durableSet, durableDelete } from './durable.js';

const PIN_KEY = 'cashier_pin_hash';
const SALT = 'hisab-cashier-v1';
export const PIN_LENGTH = 4;

export function hasPin() {
  return !!localStorage.getItem(PIN_KEY);
}

export async function hashPin(pin) {
  const data = new TextEncoder().encode(SALT + ':' + pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(pin) {
  const stored = localStorage.getItem(PIN_KEY);
  return !!stored && (await hashPin(pin)) === stored;
}

export async function setPin(pin) {
  const h = await hashPin(pin);
  localStorage.setItem(PIN_KEY, h);
  durableSet(PIN_KEY, h);
}

export function clearPin() {
  localStorage.removeItem(PIN_KEY);
  durableDelete(PIN_KEY);
}
