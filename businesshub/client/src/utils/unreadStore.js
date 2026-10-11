import { useSyncExternalStore } from 'react';

// One shared "unread notifications" number. The bell in the header updates it
// every time it loads; the sidebar reads it. That way both always agree and
// the sidebar needs no extra requests to the server.
let count = 0;
const listeners = new Set();

export function setUnread(n) {
  const next = Math.max(0, Number(n) || 0);
  if (next === count) return;
  count = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useUnread = () => useSyncExternalStore(subscribe, () => count, () => 0);
