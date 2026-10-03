/**
 * Service-area lookup (suburb name or postcode → in / out) and the map
 * projection for the coverage map. Pure; the area list is passed in.
 */

export interface AreaEntry {
  suburb: string;
  postcode: string;
  /** Slug of the area page, if the suburb has one. */
  page?: string;
  lat?: number;
  lng?: number;
}

export interface Match {
  status: 'in' | 'out' | 'invalid';
  /** The cleaned suburb name in title case, or the postcode that was typed. */
  query: string;
  matches: AreaEntry[];
}

const STATES = /\b(nsw|vic|qld|act|sa|wa|tas|nt)\b/g;

/** "  Mt. Gravatt, QLD 4122 " → "mount gravatt" */
export function normaliseQuery(raw: string): string {
  return raw
    .toLowerCase()
    .replace(STATES, ' ')
    .replace(/\b\d{4}\b/g, ' ')
    .replace(/[^a-z\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\bmt\b/g, 'mount');
}

const titleCase = (s: string) => s.replace(/(^|[\s-])([a-z])/g, (_, sep: string, c: string) => sep + c.toUpperCase());

export function findArea(raw: string, areas: readonly AreaEntry[]): Match {
  const trimmed = raw.trim();
  const postcode = trimmed.match(/\b\d{4}\b/)?.[0] ?? null;
  const name = normaliseQuery(trimmed);
  const numericOnly = /^\d+$/.test(trimmed);

  if ((!name && !postcode) || name.length === 1 || (numericOnly && !postcode)) {
    return { status: 'invalid', query: trimmed, matches: [] };
  }

  // A typed suburb name wins over a postcode ("Kedron 4032" is Kedron).
  if (name) {
    const matches = areas.filter((a) => normaliseQuery(a.suburb) === name);
    return { status: matches.length ? 'in' : 'out', query: titleCase(name), matches };
  }
  const matches = areas.filter((a) => a.postcode === postcode);
  return { status: matches.length ? 'in' : 'out', query: postcode!, matches };
}

export interface GeoPoint {
  id: string;
  lat?: number;
  lng?: number;
}

export interface ProjectedPoint {
  id: string;
  x: number;
  y: number;
}

/**
 * Projects lat/lng into SVG coordinates: equirectangular with longitude scaled
 * by cos(mean latitude), accurate enough at suburb scale.
 */
export function projectPoints(points: readonly GeoPoint[], opts: { width: number; padding?: number }) {
  const padding = opts.padding ?? 32;
  const located = points.filter((p): p is ProjectedInput => typeof p.lat === 'number' && typeof p.lng === 'number');
  if (located.length === 0) return { points: [] as ProjectedPoint[], width: opts.width, height: opts.width / 2 };

  const lats = located.map((p) => p.lat);
  const lngs = located.map((p) => p.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = Math.max((maxLng - minLng) * k, 1e-6);
  const spanY = Math.max(maxLat - minLat, 1e-6);
  const scale = (opts.width - 2 * padding) / spanX;

  return {
    width: opts.width,
    height: spanY * scale + 2 * padding,
    points: located.map((p) => ({
      id: p.id,
      x: padding + (p.lng - minLng) * k * scale,
      y: padding + (maxLat - p.lat) * scale,
    })),
  };
}

type ProjectedInput = GeoPoint & { lat: number; lng: number };
