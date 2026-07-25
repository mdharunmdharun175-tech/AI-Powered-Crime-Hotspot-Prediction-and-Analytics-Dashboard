import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { MapPin, Flame, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { ErrorState, EmptyState } from '../components/ui/Feedback';
import { fetchCrimesForMap, fetchDistricts } from '../services/dataLayer';
import { detectHotspots } from '../services/hotspots';
import { useFilters } from '../services/filterContext';
import { CRIME_TYPE_OPTIONS, SEVERITY_OPTIONS } from '../services/analytics';
import { cn, riskHex, formatDate, errorMessage } from '../services/utils';
import type { Crime, Hotspot } from '../services/types';

// Fix default leaflet marker icons (not used for circles but keeps CSS happy)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

const sevHex: Record<string, string> = {
  Critical: '#dc2626',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#22c55e',
};

export function CrimeMap() {
  const { filters } = useFilters();
  const [crimes, setCrimes] = useState<Crime[]>([]);
  const [districts, setDistricts] = useState<{ district: string; state: string }[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'markers' | 'hotspots'>('hotspots');
  const [localType, setLocalType] = useState('');
  const [localSev, setLocalSev] = useState('');
  const [localDistrict, setLocalDistrict] = useState('');
  const [showHeat, setShowHeat] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [c, d] = await Promise.all([fetchCrimesForMap(2500), fetchDistricts()]);
        if (!mounted) return;
        setCrimes(c);
        setDistricts(d);
      } catch (e) {
        setError(errorMessage(e, "Failed to load map data"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    let f = crimes;
    if (localType) f = f.filter((c) => c.crime_type === localType);
    if (localSev) f = f.filter((c) => c.severity === localSev);
    if (localDistrict) f = f.filter((c) => c.district === localDistrict);
    if (filters.dateFrom) f = f.filter((c) => c.date >= filters.dateFrom!);
    if (filters.dateTo) f = f.filter((c) => c.date <= filters.dateTo!);
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      f = f.filter((c) => c.district.toLowerCase().includes(q) || c.crime_type.toLowerCase().includes(q));
    }
    return f;
  }, [crimes, localType, localSev, localDistrict, filters]);

  useEffect(() => {
    if (filtered.length > 20) {
      // DBSCAN in background chunk to avoid blocking UI
      const id = setTimeout(() => {
        const hs = detectHotspots(filtered, 1500, 5);
        setHotspots(hs);
      }, 50);
      return () => clearTimeout(id);
    } else {
      setHotspots([]);
    }
  }, [filtered]);

  const heatPoints = useMemo(
    () => filtered.slice(0, 800).map((c) => [Number(c.latitude), Number(c.longitude), 0.6] as [number, number, number]),
    [filtered],
  );

  const center = useMemo<[number, number]>(() => {
    if (hotspots.length) return [hotspots[0].center_lat, hotspots[0].center_lng];
    if (filtered.length) return [Number(filtered[0].latitude), Number(filtered[0].longitude)];
    return [22.5937, 79.9629]; // India center
  }, [hotspots, filtered]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="skeleton h-[600px] rounded-2xl" />
      </div>
    );
  }
  if (error) return <ErrorState title="Map unavailable" description={error} />;
  if (crimes.length === 0)
    return <EmptyState icon={<MapPin className="h-6 w-6" />} title="No crime data to display" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Interactive Crime Map</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filtered.length.toLocaleString()} incidents · {hotspots.length} hotspots detected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            <button
              onClick={() => setView('hotspots')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'hotspots'
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              Hotspots
            </button>
            <button
              onClick={() => setView('markers')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'markers'
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              Markers
            </button>
          </div>
          <button
            onClick={() => setShowHeat((s) => !s)}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors',
              showHeat
                ? 'border-red-500 bg-red-50 text-red-600 dark:border-red-600 dark:bg-red-900/30 dark:text-red-400'
                : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300',
            )}
          >
            <Flame className="h-3.5 w-3.5" />
            Heat
          </button>
        </div>
      </div>

      {/* Map filters */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700/60 dark:bg-slate-900/80 sm:grid-cols-3 lg:grid-cols-4">
        <Select
          label="District"
          value={localDistrict}
          onChange={(v) => setLocalDistrict(v)}
          placeholder="All districts"
          options={districts.map((d) => ({ label: d.district, value: d.district }))}
        />
        <Select
          label="Crime type"
          value={localType}
          onChange={(v) => setLocalType(v)}
          placeholder="All types"
          options={CRIME_TYPE_OPTIONS}
        />
        <Select
          label="Severity"
          value={localSev}
          onChange={(v) => setLocalSev(v)}
          placeholder="All severities"
          options={SEVERITY_OPTIONS}
        />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Legend</span>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
            <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="h-3 w-3 rounded-full" style={{ background: '#ef4444' }} /> High
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="h-3 w-3 rounded-full" style={{ background: '#f97316' }} /> Medium
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="h-3 w-3 rounded-full" style={{ background: '#22c55e' }} /> Low
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Map */}
        <Card padding="none" className="overflow-hidden lg:col-span-3">
          <div className="h-[600px] w-full">
            <MapContainer center={center} zoom={5} scrollWheelZoom={true} className="h-full w-full">
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Street">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Dark">
                  <TileLayer
                    attribution='&copy; OpenStreetMap &copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Satellite">
                  <TileLayer
                    attribution='&copy; Esri'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />
                </LayersControl.BaseLayer>
              </LayersControl>

              {showHeat && heatPoints.length > 0 && <HeatLayer points={heatPoints} />}

              {view === 'hotspots'
                ? hotspots.map((h) => (
                    <CircleMarker
                      key={h.id}
                      center={[h.center_lat, h.center_lng]}
                      radius={Math.min(Math.max(h.crime_count / 3, 10), 28)}
                      pathOptions={{
                        color: riskHex(h.risk_level),
                        fillColor: riskHex(h.risk_level),
                        fillOpacity: 0.35,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-800">Hotspot #{h.cluster_id}</p>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                              style={{ background: riskHex(h.risk_level) }}
                            >
                              {h.risk_level} Risk
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{h.district}, {h.state}</p>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <span className="text-slate-500">Crimes:</span>
                            <span className="font-semibold">{h.crime_count}</span>
                            <span className="text-slate-500">Dominant:</span>
                            <span className="font-semibold">{h.dominant_crime}</span>
                            <span className="text-slate-500">Radius:</span>
                            <span className="font-semibold">{Math.round(h.radius_m)} m</span>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))
                : filtered.slice(0, 600).map((c) => (
                    <CircleMarker
                      key={c.id}
                      center={[Number(c.latitude), Number(c.longitude)]}
                      radius={6}
                      pathOptions={{
                        color: sevHex[c.severity] ?? '#3b82f6',
                        fillColor: sevHex[c.severity] ?? '#3b82f6',
                        fillOpacity: 0.7,
                        weight: 1.5,
                      }}
                    >
                      <Popup>
                        <div className="space-y-1.5">
                          <p className="font-semibold text-slate-800">{c.crime_type}</p>
                          <p className="text-xs text-slate-600">{c.district}, {c.state}</p>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <span className="text-slate-500">Date:</span>
                            <span className="font-semibold">{formatDate(c.date)}</span>
                            <span className="text-slate-500">Severity:</span>
                            <span className="font-semibold" style={{ color: sevHex[c.severity] }}>{c.severity}</span>
                            <span className="text-slate-500">Victims:</span>
                            <span className="font-semibold">{c.victims}</span>
                            <span className="text-slate-500">Status:</span>
                            <span className="font-semibold">{c.status}</span>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
            </MapContainer>
          </div>
        </Card>

        {/* Hotspot list */}
        <Card className="lg:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <p className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">
              Detected Hotspots
            </p>
          </div>
          <div className="max-h-[540px] space-y-2 overflow-y-auto pr-1">
            {hotspots.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No clusters detected with current filters.</p>
            ) : (
              hotspots.map((h) => (
                <div
                  key={h.id}
                  className="rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{h.district}</p>
                    <Badge variant="risk" value={h.risk_level}>{h.risk_level}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{h.state}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">{h.crime_count} crimes</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">{h.dominant_crime}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * Leaflet heat layer using leaflet.heat, wired via react-leaflet's useMap hook.
 */
function HeatLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !(L as unknown as { heat?: unknown }).heat) return;
    const Lh = L as unknown as { heat: (pts: [number, number, number][], opts: Record<string, unknown>) => L.Layer };
    const layer = Lh.heat(points, { radius: 35, blur: 25, maxZoom: 12, max: 1.0 });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);
  return null;
}
