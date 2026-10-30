// Session-scoped state. sessionStorage can throw (private mode, blocked
// storage) — it must never break the page, so every access is guarded.
const PREFIX = 'paradise-v2:';

export const store = {
  get(k) { try { return sessionStorage.getItem(PREFIX + k); } catch (e) { return null; } },
  set(k, v) { try { sessionStorage.setItem(PREFIX + k, v); } catch (e) { /* ignore */ } },
};
