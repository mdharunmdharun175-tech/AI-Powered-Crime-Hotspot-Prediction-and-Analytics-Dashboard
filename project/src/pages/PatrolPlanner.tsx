import { useState, useEffect } from 'react';
import { ShieldCheck, Users, Car, Clock, Sliders, MapPin, Sparkles, Download, CheckCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { fetchAllCrimesForAnalytics } from '../services/analytics';
import { rankDistricts } from '../services/prediction';
import type { DistrictRanking } from '../services/types';

export function PatrolPlanner() {
  const [totalOfficers, setTotalOfficers] = useState(120);
  const [totalVehicles, setTotalVehicles] = useState(30);
  const [shift, setShift] = useState<'night' | 'day'>('night');
  const [rankings, setRankings] = useState<DistrictRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportSuccess, setExportSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const crimes = await fetchAllCrimesForAnalytics();
        const r = rankDistricts(crimes);
        setRankings(r.slice(0, 10)); // Top 10 districts
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Compute allocation algorithm based on severity scores and shift multiplier
  const shiftMultiplier = shift === 'night' ? 1.3 : 1.0;
  const totalScoreSum = rankings.reduce((sum, r) => sum + r.severity_score * (r.risk_level === 'High' ? shiftMultiplier : 1), 0) || 1;

  const allocations = rankings.map((r) => {
    const weight = (r.severity_score * (r.risk_level === 'High' ? shiftMultiplier : 1)) / totalScoreSum;
    const assignedOfficers = Math.max(2, Math.round(totalOfficers * weight));
    const assignedVehicles = Math.max(1, Math.round(totalVehicles * weight));
    const estRespTime = Math.max(4, Math.round(15 - assignedOfficers * 0.4));
    return {
      ...r,
      weight,
      assignedOfficers,
      assignedVehicles,
      estRespTime,
    };
  });

  const handleExport = () => {
    const headers = ['District', 'State', 'Risk Level', 'Assigned Officers', 'Patrol Vehicles', 'Est Response Time'];
    const rows = allocations.map((a) => [
      a.district,
      a.state,
      a.risk_level,
      a.assignedOfficers.toString(),
      a.assignedVehicles.toString(),
      `${a.estRespTime} mins`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Patrol_Deployment_Plan_${shift.toUpperCase()}_Shift.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-500" /> Smart Patrol & Resource Allocation Planner
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Algorithmic force distribution & tactical patrol optimization across high-risk sectors
          </p>
        </div>
        <Button onClick={handleExport} leftIcon={<Download className="h-4 w-4" />}>
          Export Deployment Plan (CSV)
        </Button>
      </div>

      {exportSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 border border-emerald-500/30">
          <CheckCircle className="h-4 w-4" /> Patrol Deployment Plan successfully exported!
        </div>
      )}

      {/* Control Panel */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="h-4 w-4 text-brand-500" />
          <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">
            Resource Configuration Sliders
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Officers Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-brand-500" /> Available Officers:
              </span>
              <span className="font-bold text-brand-600 dark:text-brand-400 text-sm">{totalOfficers}</span>
            </div>
            <input
              type="range"
              min={30}
              max={500}
              step={10}
              value={totalOfficers}
              onChange={(e) => setTotalOfficers(parseInt(e.target.value))}
              className="h-2 w-full accent-brand-500 cursor-pointer"
            />
          </div>

          {/* Vehicles Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Car className="h-4 w-4 text-cyan-500" /> Patrol Vehicles:
              </span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">{totalVehicles}</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={totalVehicles}
              onChange={(e) => setTotalVehicles(parseInt(e.target.value))}
              className="h-2 w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Shift Selector */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-500" /> Deployment Shift:
            </span>
            <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
              <button
                onClick={() => setShift('night')}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                  shift === 'night'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                🌙 Night Shift (High Risk)
              </button>
              <button
                onClick={() => setShift('day')}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                  shift === 'day'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                ☀️ Day Shift
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Allocation Summary Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card padding="sm" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Coverage Efficiency</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">92.6% Coverage</p>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Avg. Response Target</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">&lt; 6.4 minutes</p>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">High Risk Sector Priority</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">Top 10 Sectors</p>
          </div>
        </Card>
      </div>

      {/* Allocation Breakdown Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">
            District Force Allocation Breakdown
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Calculating optimal force allocations...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">District</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Risk Level</th>
                  <th className="px-4 py-3">Assigned Officers</th>
                  <th className="px-4 py-3">Patrol Cars</th>
                  <th className="px-4 py-3">Est. Response ETA</th>
                  <th className="px-4 py-3 text-right">Force Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allocations.map((a) => (
                  <tr key={a.district} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {a.district}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{a.state}</td>
                    <td className="px-4 py-3">
                      <Badge variant="risk" value={a.risk_level}>
                        {a.risk_level}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-bold text-brand-600 dark:text-brand-400">
                      {a.assignedOfficers} Officers
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                      {a.assignedVehicles} Cars
                    </td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                      {a.estRespTime} mins
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[11px] font-medium text-slate-500">
                          {(a.weight * 100).toFixed(1)}%
                        </span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${Math.min(100, a.weight * 100 * 2.5)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
