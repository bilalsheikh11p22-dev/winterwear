/**
 * Address -> coordinates using OpenStreetMap Nominatim (free, no API key).
 * Usage policy: identify the app, max ~1 request/second. Results are cached in memory,
 * failed lookups are not retried for 10 minutes.
 */
const cache = new Map(); // query -> { lat, lng }
const failed = new Map(); // query -> timestamp
const RETRY_AFTER_MS = 10 * 60 * 1000;

let lastRequestAt = 0;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const lookup = async (query) => {
  if (cache.has(query)) return cache.get(query);
  if (failed.has(query) && Date.now() - failed.get(query) < RETRY_AFTER_MS) return null;

  const sinceLast = Date.now() - lastRequestAt;
  if (sinceLast < 1100) await wait(1100 - sinceLast);
  lastRequestAt = Date.now();

  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' +
      encodeURIComponent(query);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'WinterWear-Delivery/1.0 (rider navigation)',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);

    const results = await res.json();
    const hit = results?.[0];
    if (hit && Number.isFinite(Number(hit.lat)) && Number.isFinite(Number(hit.lon))) {
      const point = { lat: Number(hit.lat), lng: Number(hit.lon) };
      cache.set(query, point);
      return point;
    }
  } catch (err) {
    console.warn(`[Geocode] "${query}" failed: ${err.message}`);
  }

  failed.set(query, Date.now());
  return null;
};

/** Tries each query in order (most specific first) and returns the first match. */
export const geocode = async (queries) => {
  for (const q of queries.filter(Boolean)) {
    const point = await lookup(q);
    if (point) return point;
  }
  return null;
};

export const formatShippingAddress = (a = {}) =>
  [a.apartment, a.street, a.city, a.state, a.postalCode, a.country || 'Pakistan']
    .filter(Boolean)
    .join(', ');

export const addressQueries = (a = {}) => [
  formatShippingAddress(a),
  [a.street, a.city, a.country || 'Pakistan'].filter(Boolean).join(', '),
  [a.city, a.country || 'Pakistan'].filter(Boolean).join(', '),
];
