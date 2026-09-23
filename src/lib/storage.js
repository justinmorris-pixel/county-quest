export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* ignore */
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    /* ignore */
  }
}
