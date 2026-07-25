import { useState, type FormEvent } from 'react';
import { AlertTriangle, ShieldCheck, MapPin, X, Clock, Users, Navigation } from 'lucide-react';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { CRIME_TYPE_OPTIONS, SEVERITY_OPTIONS } from '../services/analytics';
import { createIncident } from '../services/dataLayer';
import type { Crime, CrimeType, CrimeSeverity } from '../services/types';

const DISTRICT_LIST = [
  { district: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.877 },
  { district: 'Delhi', state: 'Delhi', lat: 28.704, lng: 77.102 },
  { district: 'Bengaluru', state: 'Karnataka', lat: 12.972, lng: 77.594 },
  { district: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.487 },
  { district: 'Chennai', state: 'Tamil Nadu', lat: 13.083, lng: 80.270 },
  { district: 'Kolkata', state: 'West Bengal', lat: 22.573, lng: 88.364 },
  { district: 'Pune', state: 'Maharashtra', lat: 18.520, lng: 73.856 },
  { district: 'Ahmedabad', state: 'Gujarat', lat: 23.023, lng: 72.572 },
];

export function NewIncidentModal({
  isOpen,
  onClose,
  onIncidentCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onIncidentCreated: (newCrime: Crime) => void;
}) {
  const [district, setDistrict] = useState('Mumbai');
  const [crimeType, setCrimeType] = useState<CrimeType>('Theft');
  const [severity, setSeverity] = useState<CrimeSeverity>('High');
  const [victims, setVictims] = useState(1);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Dispatch calculation values
  const currentDistObj = DISTRICT_LIST.find((d) => d.district === district) ?? DISTRICT_LIST[0];

  const calculateDispatch = () => {
    let etaMinutes = 8;
    let unitsNeeded = 2;
    if (severity === 'Critical') { etaMinutes = 4; unitsNeeded = 5; }
    else if (severity === 'High') { etaMinutes = 6; unitsNeeded = 3; }
    else if (severity === 'Medium') { etaMinutes = 9; unitsNeeded = 2; }
    else { etaMinutes = 12; unitsNeeded = 1; }

    let specialist = 'Patrol Unit';
    if (crimeType === 'Cybercrime') specialist = 'Cyber Cell Specialist';
    else if (crimeType === 'Homicide' || crimeType === 'Robbery') specialist = 'Armed Response Squad';
    else if (crimeType === 'Drug Offense') specialist = 'Narcotics Control';

    return { etaMinutes, unitsNeeded, specialist };
  };

  const dispatchInfo = calculateDispatch();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const now = new Date();
    const newCrimeData: Omit<Crime, 'id'> = {
      date: now.toISOString().split('T')[0],
      crime_type: crimeType,
      district: currentDistObj.district,
      state: currentDistObj.state,
      latitude: currentDistObj.lat + (Math.random() - 0.5) * 0.05,
      longitude: currentDistObj.lng + (Math.random() - 0.5) * 0.05,
      severity,
      victims,
      status: 'Under Investigation',
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      weekday: now.getDay(),
      hour: now.getHours(),
      season: now.getMonth() >= 5 && now.getMonth() <= 8 ? 'Monsoon' : 'Summer',
      description: description.trim() || `Realtime ${crimeType} report filed in ${district}.`,
    };

    try {
      const created = await createIncident(newCrimeData);
      setSuccessToast(true);
      onIncidentCreated(created);
      setTimeout(() => {
        setSuccessToast(false);
        setIsSubmitting(false);
        onClose();
      }, 1200);
    } catch {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 ring-1 ring-red-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Log Emergency Crime Incident
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                File incident & dispatch nearest response units
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="District Location"
              value={district}
              onChange={(v) => setDistrict(v)}
              options={DISTRICT_LIST.map((d) => ({ label: `${d.district} (${d.state})`, value: d.district }))}
            />
            <Select
              label="Crime Category"
              value={crimeType}
              onChange={(v) => setCrimeType(v as CrimeType)}
              options={CRIME_TYPE_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Severity Level"
              value={severity}
              onChange={(v) => setSeverity(v as CrimeSeverity)}
              options={SEVERITY_OPTIONS}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Victims Affected
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={victims}
                onChange={(e) => setVictims(parseInt(e.target.value) || 1)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Incident Description / Dispatch Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide tactical notes or location details..."
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Unit Dispatch Engine Calculator Card */}
          <div className="rounded-xl border border-brand-500/20 bg-brand-50/40 p-3.5 dark:border-brand-500/30 dark:bg-brand-950/20">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="h-4 w-4 text-brand-500" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Automated Emergency Dispatch Analysis
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-white/80 p-2 dark:bg-slate-900/80">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <Clock className="h-3 w-3 text-amber-500" /> Est. ETA
                </div>
                <p className="mt-0.5 text-sm font-bold text-amber-600 dark:text-amber-400">
                  {dispatchInfo.etaMinutes} mins
                </p>
              </div>

              <div className="rounded-lg bg-white/80 p-2 dark:bg-slate-900/80">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <Users className="h-3 w-3 text-brand-500" /> Dispatch Units
                </div>
                <p className="mt-0.5 text-sm font-bold text-brand-600 dark:text-brand-400">
                  {dispatchInfo.unitsNeeded} Vehicles
                </p>
              </div>

              <div className="rounded-lg bg-white/80 p-2 dark:bg-slate-900/80">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3 w-3 text-red-500" /> Station
                </div>
                <p className="mt-0.5 truncate text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {district} HQ
                </p>
              </div>
            </div>
          </div>

          {successToast && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-4 w-4" /> Incident filed & dispatch order issued!
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} size="sm">
              Dispatch & Submit Incident
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
