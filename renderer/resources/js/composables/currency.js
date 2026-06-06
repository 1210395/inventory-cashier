// Single source of truth for money formatting so the Settings currency applies
// everywhere (previously each page hardcoded ILS / its own formatter).
import { reactive } from 'vue';

const state = reactive({ symbol: '₪', position: 'before' });

export function setCurrency(symbol, position) {
  if (symbol) state.symbol = symbol;
  if (position) state.position = position;
}

export function initCurrencyFromStorage() {
  try {
    const s = JSON.parse(localStorage.getItem('appSettings') || 'null');
    if (s) setCurrency(s.currency_symbol, s.currency_position);
  } catch (e) { /* ignore */ }
}

export function formatMoney(value) {
  const n = parseFloat(value) || 0;
  const f = n.toFixed(2);
  return state.position === 'after' ? `${f}${state.symbol}` : `${state.symbol}${f}`;
}
