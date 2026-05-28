const KEY = 'anadoluOfflineQueue';
const MAX_QUEUE = 50;

export function loadOfflineQueue() {
  try {
    const q = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(q) ? q.slice(0, MAX_QUEUE) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue) {
  localStorage.setItem(KEY, JSON.stringify(queue.slice(0, MAX_QUEUE)));
}

export function pushOfflineMessage(queue, text) {
  const next = [...queue, text].slice(-MAX_QUEUE);
  saveOfflineQueue(next);
  return next;
}

export function shiftOfflineMessage(queue) {
  const next = [...queue];
  next.shift();
  saveOfflineQueue(next);
  return next;
}
