import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- ML helpers (server-side mirrors of the TS services) ----------

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function sevScore(s: string): number {
  return s === "Critical" ? 4 : s === "High" ? 3 : s === "Medium" ? 2 : 1;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface CrimeRow {
  id: string;
  date: string;
  crime_type: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  severity: string;
  victims: number;
  status: string;
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  season: string;
  description?: string;
}

function computeAnalytics(crimes: CrimeRow[]) {
  const total = crimes.length;
  const active = crimes.filter((c) => c.status === "Open" || c.status === "Under Investigation").length;
  const closed = crimes.filter((c) => c.status === "Closed" || c.status === "Arrest Made").length;
  const arrests = crimes.filter((c) => c.status === "Arrest Made").length;
  const victims = crimes.reduce((s, c) => s + (c.victims ?? 1), 0);

  const typeCounts = new Map<string, number>();
  const sevCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  const districtCounts = new Map<string, { state: string; count: number }>();
  const monthlyCounts = new Map<string, number>();
  const yearlyCounts = new Map<number, number>();
  const weekdayCounts = new Array(7).fill(0);
  const hourlyCounts = new Array(24).fill(0);
  const seasonCounts = new Map<string, number>();

  for (const c of crimes) {
    typeCounts.set(c.crime_type, (typeCounts.get(c.crime_type) ?? 0) + 1);
    sevCounts.set(c.severity, (sevCounts.get(c.severity) ?? 0) + 1);
    statusCounts.set(c.status, (statusCounts.get(c.status) ?? 0) + 1);
    if (!districtCounts.has(c.district)) districtCounts.set(c.district, { state: c.state, count: 0 });
    districtCounts.get(c.district)!.count += 1;
    const mk = `${c.year}-${String(c.month).padStart(2, "0")}`;
    monthlyCounts.set(mk, (monthlyCounts.get(mk) ?? 0) + 1);
    yearlyCounts.set(c.year, (yearlyCounts.get(c.year) ?? 0) + 1);
    weekdayCounts[c.weekday] += 1;
    hourlyCounts[c.hour] += 1;
    seasonCounts.set(c.season, (seasonCounts.get(c.season) ?? 0) + 1);
  }

  return {
    total_crimes: total,
    active_cases: active,
    closed_cases: closed,
    arrest_rate: total ? (arrests / total) * 100 : 0,
    total_victims: victims,
    top_crime_type: [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Theft",
    crime_types: [...typeCounts.entries()].map(([type, count]) => ({ type, count, pct: (count / total) * 100 })).sort((a, b) => b.count - a.count),
    severity_breakdown: ["Low", "Medium", "High", "Critical"].map((sev) => ({ severity: sev, count: sevCounts.get(sev) ?? 0, pct: total ? ((sevCounts.get(sev) ?? 0) / total) * 100 : 0 })),
    districts: [...districtCounts.entries()].map(([district, v]) => ({ district, state: v.state, count: v.count })).sort((a, b) => b.count - a.count),
    monthly_trend: [...monthlyCounts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, count]) => { const [, m] = k.split("-"); return { label: `${MONTH_LABELS[parseInt(m) - 1]} ${k.slice(0, 4)}`, count }; }),
    yearly_trend: [...yearlyCounts.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ label: String(year), count })),
    weekday_pattern: WEEKDAY_LABELS.map((label, i) => ({ label, count: weekdayCounts[i] })),
    hourly_pattern: hourlyCounts.map((count, h) => ({ label: `${h}:00`, count })),
    seasonal_pattern: ["Winter", "Summer", "Monsoon", "Post-Monsoon"].map((s) => ({ label: s, count: seasonCounts.get(s) ?? 0 })),
    status_breakdown: ["Open", "Under Investigation", "Closed", "Arrest Made"].map((status) => ({ status, count: statusCounts.get(status) ?? 0, pct: total ? ((statusCounts.get(status) ?? 0) / total) * 100 : 0 })),
  };
}

function forecastMonthly(crimes: CrimeRow[], forecastMonths = 6) {
  const monthly = new Map<string, number>();
  for (const c of crimes) {
    const k = `${c.year}-${String(c.month).padStart(2, "0")}`;
    monthly.set(k, (monthly.get(k) ?? 0) + 1);
  }
  const sorted = [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (sorted.length < 3) return [];
  const n = sorted.length;
  const xs = sorted.map((_, i) => i);
  const ys = sorted.map(([, v]) => v);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - xMean) * (ys[i] - yMean); den += (xs[i] - xMean) ** 2; }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const residuals = ys.map((y, i) => y - (slope * xs[i] + intercept));
  const residStd = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / (n - 2 || 1));
  const band = 1.96 * residStd;
  const points = sorted.map(([k, v], i) => { const [, m] = k.split("-"); return { label: `${MONTH_LABELS[parseInt(m) - 1]} ${k.slice(0, 4)}`, historical: v, predicted: Math.max(0, Math.round(slope * i + intercept)), lower: 0, upper: 0 }; });
  const lastKey = sorted[sorted.length - 1][0];
  const [lastY, lastM] = lastKey.split("-").map(Number);
  let curY = lastY, curM = lastM;
  for (let f = 1; f <= forecastMonths; f++) { curM++; if (curM > 12) { curM = 1; curY++; } const xIdx = n + f - 1; const pred = Math.max(0, Math.round(slope * xIdx + intercept)); points.push({ label: `${MONTH_LABELS[curM - 1]} ${curY}`, historical: null, predicted: pred, lower: Math.max(0, Math.round(pred - band)), upper: Math.round(pred + band) }); }
  return points;
}

function dbscan(crimes: CrimeRow[], epsM = 1500, minPts = 5) {
  const pts = crimes.map((c) => ({ lat: Number(c.latitude), lng: Number(c.longitude), crime: c }));
  const n = pts.length;
  const labels = new Array(n).fill(-1);
  let clusterId = 0;
  const visited = new Array(n).fill(false);
  const regionQuery = (p: number) => { const nb: number[] = []; for (let i = 0; i < n; i++) { if (i === p) continue; if (haversineM(pts[p].lat, pts[p].lng, pts[i].lat, pts[i].lng) <= epsM) nb.push(i); } return nb; };
  for (let p = 0; p < n; p++) {
    if (visited[p]) continue;
    visited[p] = true;
    const neighbors = regionQuery(p);
    if (neighbors.length + 1 < minPts) { labels[p] = -2; continue; }
    clusterId++;
    labels[p] = clusterId;
    const queue = [...neighbors];
    while (queue.length) {
      const q = queue.shift()!;
      if (!visited[q]) { visited[q] = true; const qn = regionQuery(q); if (qn.length + 1 >= minPts) { for (const nb of qn) if (!queue.includes(nb) && labels[nb] !== clusterId) queue.push(nb); } }
      if (labels[q] === -1 || labels[q] === -2) labels[q] = clusterId;
    }
  }
  const clusters = new Map<number, typeof pts>();
  for (let i = 0; i < n; i++) if (labels[i] > 0) { const arr = clusters.get(labels[i]) ?? []; arr.push(pts[i]); clusters.set(labels[i], arr); }
  const result: { clusterId: number; points: typeof pts; centerLat: number; centerLng: number; radiusM: number }[] = [];
  for (const [id, cp] of clusters) {
    const cLat = cp.reduce((s, p) => s + p.lat, 0) / cp.length;
    const cLng = cp.reduce((s, p) => s + p.lng, 0) / cp.length;
    let maxR = 0; for (const p of cp) { const d = haversineM(cLat, cLng, p.lat, p.lng); if (d > maxR) maxR = d; }
    result.push({ clusterId: id, points: cp, centerLat: cLat, centerLng: cLng, radiusM: Math.max(maxR, 200) });
  }
  return result.sort((a, b) => b.points.length - a.points.length);
}

function detectHotspots(crimes: CrimeRow[]) {
  const clusters = dbscan(crimes, 1500, 5);
  if (!clusters.length) return [];
  const withMeta = clusters.map((cl) => {
    const tc = new Map<string, number>(); let ss = 0;
    for (const p of cl.points) { tc.set(p.crime.crime_type, (tc.get(p.crime.crime_type) ?? 0) + 1); ss += sevScore(p.crime.severity); }
    const dominant = [...tc.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return { cl, dominant, avgSev: ss / cl.points.length, district: cl.points[0]?.crime.district ?? "Unknown", state: cl.points[0]?.crime.state ?? "Unknown" };
  });
  const sorted = [...withMeta].sort((a, b) => b.cl.points.length - a.cl.points.length);
  const nn = sorted.length;
  const highT = Math.floor(nn / 3), medT = Math.floor((2 * nn) / 3);
  return withMeta.map((m) => {
    const rank = sorted.indexOf(m);
    let risk = "Low";
    if (m.avgSev >= 3 || rank < highT) risk = "High"; else if (rank < medT || m.avgSev >= 2.5) risk = "Medium";
    return { cluster_id: m.cl.clusterId, center_lat: m.cl.centerLat, center_lng: m.cl.centerLng, risk_level: risk, crime_count: m.cl.points.length, radius_m: m.cl.radiusM, dominant_crime: m.dominant, district: m.district, state: m.state };
  });
}

function generateInsights(crimes: CrimeRow[]) {
  if (!crimes.length) return [];
  const out: { title: string; body: string; category: string; severity: string; tags: string[] }[] = [];
  const years = [...new Set(crimes.map((c) => c.year))].sort();
  const lastY = years[years.length - 1], prevY = years[years.length - 2];
  const typeByYear = new Map<string, Map<number, number>>();
  for (const c of crimes) { if (!typeByYear.has(c.crime_type)) typeByYear.set(c.crime_type, new Map()); const m = typeByYear.get(c.crime_type)!; m.set(c.year, (m.get(c.year) ?? 0) + 1); }
  for (const [type, ym] of typeByYear) {
    const curr = ym.get(lastY) ?? 0, prev = prevY ? ym.get(prevY) ?? 0 : 0;
    const ch = prev ? ((curr - prev) / prev) * 100 : 0;
    if (ch > 15 && curr > 20) out.push({ title: `${type} up ${Math.round(ch)}% YoY`, body: `${type} rose ${Math.round(ch)}% from ${prevY} to ${lastY} (${prev} → ${curr}).`, category: "Trend", severity: ch > 40 ? "High" : "Medium", tags: [type, "YoY"] });
  }
  const byD = new Map<string, CrimeRow[]>();
  for (const c of crimes) { if (!byD.has(c.district)) byD.set(c.district, []); byD.get(c.district)!.push(c); }
  const ranked = [...byD.entries()].map(([d, dc]) => ({ d, avg: dc.reduce((s, c) => s + sevScore(c.severity), 0) / dc.length, n: dc.length })).sort((a, b) => b.avg * b.n - a.avg * a.n);
  for (const r of ranked.slice(0, 3)) if (r.avg >= 2.8) out.push({ title: `${r.d} is a high-risk zone`, body: `${r.d} avg severity ${r.avg.toFixed(2)}/4 across ${r.n} incidents. Increased surveillance recommended.`, category: "Hotspot", severity: r.avg >= 3.2 ? "Critical" : "High", tags: [r.d, "High Risk"] });
  const night = crimes.filter((c) => c.hour >= 18 || c.hour < 5);
  if (night.length / crimes.length > 0.4) out.push({ title: "Crime rates increase during nighttime", body: `${((night.length / crimes.length) * 100).toFixed(0)}% of incidents occur 6PM–5AM. Enhance night patrols.`, category: "Pattern", severity: "High", tags: ["Night", "Patrol"] });
  return out.sort((a, b) => sevScore(b.severity) - sevScore(a.severity));
}

// ---------- main handler ----------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/crime-api/, "").replace(/^\//, "");
    const route = path || "dashboard";

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Fetch all crimes for computation (service role bypasses RLS)
    const { data: crimes, error: cerr } = await admin
      .from("crimes")
      .select("id, date, crime_type, district, state, latitude, longitude, severity, victims, status, year, month, day, weekday, hour, season, description")
      .order("date", { ascending: true })
      .limit(10000);
    if (cerr) return json({ error: cerr.message }, 500);
    const rows = (crimes as CrimeRow[]) ?? [];

    // Apply optional filters from query params
    const q = (k: string) => url.searchParams.get(k);
    let filtered = rows;
    if (q("district")) filtered = filtered.filter((c) => c.district === q("district"));
    if (q("state")) filtered = filtered.filter((c) => c.state === q("state"));
    if (q("crimeType")) filtered = filtered.filter((c) => c.crime_type === q("crimeType"));
    if (q("severity")) filtered = filtered.filter((c) => c.severity === q("severity"));
    if (q("dateFrom")) filtered = filtered.filter((c) => c.date >= q("dateFrom")!);
    if (q("dateTo")) filtered = filtered.filter((c) => c.date <= q("dateTo")!);

    switch (route) {
      case "dashboard": {
        const summary = computeAnalytics(filtered);
        return json({ route: "dashboard", summary, total: filtered.length });
      }
      case "analytics": {
        return json({ route: "analytics", analytics: computeAnalytics(filtered) });
      }
      case "predictions": {
        const forecast = forecastMonthly(filtered, 6);
        return json({ route: "predictions", forecast, trained_on: filtered.length });
      }
      case "hotspots": {
        const hotspots = detectHotspots(filtered);
        return json({ route: "hotspots", hotspots, count: hotspots.length });
      }
      case "insights": {
        const insights = generateInsights(filtered);
        return json({ route: "insights", insights, count: insights.length });
      }
      case "reports": {
        const { data } = await admin.from("reports").select("*").order("generated_at", { ascending: false }).limit(50);
        return json({ route: "reports", reports: data ?? [] });
      }
      default:
        return json({ error: `Unknown route: ${route}. Available: dashboard, analytics, predictions, hotspots, insights, reports` }, 404);
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
