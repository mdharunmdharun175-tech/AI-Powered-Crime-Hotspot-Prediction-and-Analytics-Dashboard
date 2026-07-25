import type { Crime, Hotspot, CrimeType, RiskLevel } from './types';

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Haversine distance in meters
export function haversineM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export interface DbscanCluster {
  clusterId: number;
  points: { lat: number; lng: number; crime: Crime }[];
  centerLat: number;
  centerLng: number;
  radiusM: number;
}

/**
 * Pure-TypeScript DBSCAN clustering over crime lat/lng.
 * eps in meters, minPts minimum cluster size.
 */
export function dbscan(
  crimes: Crime[],
  epsM = 1500,
  minPts = 5,
): DbscanCluster[] {
  const pts = crimes.map((c) => ({
    lat: Number(c.latitude),
    lng: Number(c.longitude),
    crime: c,
  }));
  const n = pts.length;
  const labels = new Array(n).fill(-1); // -1 = unvisited, -2 = noise
  let clusterId = 0;

  const regionQuery = (p: number) => {
    const neighbors: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i === p) continue;
      const d = haversineM(pts[p].lat, pts[p].lng, pts[i].lat, pts[i].lng);
      if (d <= epsM) neighbors.push(i);
    }
    return neighbors;
  };

  const visited = new Array(n).fill(false);

  for (let p = 0; p < n; p++) {
    if (visited[p]) continue;
    visited[p] = true;
    const neighbors = regionQuery(p);
    if (neighbors.length + 1 < minPts) {
      labels[p] = -2; // noise
      continue;
    }
    clusterId++;
    labels[p] = clusterId;
    const seed = [...neighbors];
    const queue = [...seed];
    while (queue.length) {
      const q = queue.shift()!;
      if (!visited[q]) {
        visited[q] = true;
        const qNeighbors = regionQuery(q);
        if (qNeighbors.length + 1 >= minPts) {
          for (const nb of qNeighbors) {
            if (!queue.includes(nb) && labels[nb] !== clusterId) queue.push(nb);
          }
        }
      }
      if (labels[q] === -1 || labels[q] === -2) {
        labels[q] = clusterId;
      }
    }
  }

  const clusters = new Map<number, typeof pts>();
  for (let i = 0; i < n; i++) {
    if (labels[i] > 0) {
      const arr = clusters.get(labels[i]) ?? [];
      arr.push(pts[i]);
      clusters.set(labels[i], arr);
    }
  }

  const result: DbscanCluster[] = [];
  for (const [id, clusterPts] of clusters) {
    const centerLat = clusterPts.reduce((s, p) => s + p.lat, 0) / clusterPts.length;
    const centerLng = clusterPts.reduce((s, p) => s + p.lng, 0) / clusterPts.length;
    let maxR = 0;
    for (const p of clusterPts) {
      const d = haversineM(centerLat, centerLng, p.lat, p.lng);
      if (d > maxR) maxR = d;
    }
    result.push({
      clusterId: id,
      points: clusterPts,
      centerLat,
      centerLng,
      radiusM: Math.max(maxR, 200),
    });
  }

  return result.sort((a, b) => b.points.length - a.points.length);
}

const sevScore = (s: string) =>
  s === 'Critical' ? 4 : s === 'High' ? 3 : s === 'Medium' ? 2 : 1;

/**
 * Convert DBSCAN clusters to risk-zoned hotspots.
 * High = top 33% by crime count OR avg severity >= 3
 * Medium = middle 33%
 * Low = bottom 33%
 */
export function clustersToHotspots(clusters: DbscanCluster[]): Hotspot[] {
  if (clusters.length === 0) return [];

  const withMeta = clusters.map((cl) => {
    const typeCounts = new Map<CrimeType, number>();
    let sevSum = 0;
    for (const p of cl.points) {
      typeCounts.set(p.crime.crime_type, (typeCounts.get(p.crime.crime_type) ?? 0) + 1);
      sevSum += sevScore(p.crime.severity);
    }
    const dominant_crime = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const avgSev = sevSum / cl.points.length;
    const district = cl.points[0]?.crime.district ?? 'Unknown';
    const state = cl.points[0]?.crime.state ?? 'Unknown';
    return { cl, dominant_crime, avgSev, district, state };
  });

  const sortedByCount = [...withMeta].sort((a, b) => b.cl.points.length - a.cl.points.length);
  const n = sortedByCount.length;
  const highThresh = Math.floor(n / 3);
  const medThresh = Math.floor((2 * n) / 3);

  return withMeta.map((m) => {
    const rank = sortedByCount.indexOf(m);
    let risk_level: RiskLevel = 'Low';
    if (m.avgSev >= 3 || rank < highThresh) risk_level = 'High';
    else if (rank < medThresh || m.avgSev >= 2.5) risk_level = 'Medium';

    return {
      id: `hs-${m.cl.clusterId}`,
      cluster_id: m.cl.clusterId,
      center_lat: m.cl.centerLat,
      center_lng: m.cl.centerLng,
      risk_level,
      crime_count: m.cl.points.length,
      radius_m: m.cl.radiusM,
      dominant_crime: m.dominant_crime,
      district: m.district,
      state: m.state,
      generated_at: new Date().toISOString(),
    };
  });
}

export function detectHotspots(crimes: Crime[], epsM = 1500, minPts = 5): Hotspot[] {
  return clustersToHotspots(dbscan(crimes, epsM, minPts));
}
