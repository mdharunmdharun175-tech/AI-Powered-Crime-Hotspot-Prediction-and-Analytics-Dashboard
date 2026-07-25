/**
 * Mock data layer for Demo Mode.
 * Used when Supabase is unreachable so the app is fully functional offline.
 */
import type {
  Crime,
  CrimeType,
  CrimeSeverity,
  CrimeStatus,
  Insight,
  ReportRecord,
  Profile,
} from './types';

const CRIME_TYPES: CrimeType[] = [
  'Theft', 'Burglary', 'Robbery', 'Vehicle Theft', 'Assault',
  'Cybercrime', 'Kidnapping', 'Homicide', 'Sexual Offense', 'Drug Offense',
];
const SEVERITIES: CrimeSeverity[] = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES: CrimeStatus[] = ['Open', 'Under Investigation', 'Closed', 'Arrest Made'];


// Major Indian districts with approximate lat/lng
const DISTRICTS: { district: string; state: string; lat: number; lng: number }[] = [
  { district: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.877 },
  { district: 'Delhi', state: 'Delhi', lat: 28.704, lng: 77.102 },
  { district: 'Bengaluru', state: 'Karnataka', lat: 12.972, lng: 77.594 },
  { district: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.487 },
  { district: 'Chennai', state: 'Tamil Nadu', lat: 13.083, lng: 80.270 },
  { district: 'Kolkata', state: 'West Bengal', lat: 22.573, lng: 88.364 },
  { district: 'Pune', state: 'Maharashtra', lat: 18.520, lng: 73.856 },
  { district: 'Ahmedabad', state: 'Gujarat', lat: 23.023, lng: 72.572 },
  { district: 'Jaipur', state: 'Rajasthan', lat: 26.912, lng: 75.788 },
  { district: 'Lucknow', state: 'Uttar Pradesh', lat: 26.847, lng: 80.947 },
  { district: 'Surat', state: 'Gujarat', lat: 21.170, lng: 72.831 },
  { district: 'Kanpur', state: 'Uttar Pradesh', lat: 26.449, lng: 80.331 },
  { district: 'Nagpur', state: 'Maharashtra', lat: 21.146, lng: 79.089 },
  { district: 'Patna', state: 'Bihar', lat: 25.612, lng: 85.158 },
  { district: 'Indore', state: 'Madhya Pradesh', lat: 22.720, lng: 75.857 },
  { district: 'Bhopal', state: 'Madhya Pradesh', lat: 23.259, lng: 77.413 },
  { district: 'Vadodara', state: 'Gujarat', lat: 22.310, lng: 73.193 },
  { district: 'Coimbatore', state: 'Tamil Nadu', lat: 11.017, lng: 76.956 },
  { district: 'Agra', state: 'Uttar Pradesh', lat: 27.177, lng: 78.008 },
  { district: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.686, lng: 83.219 },
];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}

function randInt(min: number, max: number, r: () => number) {
  return Math.floor(r() * (max - min + 1)) + min;
}

function dateFromParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function seasonFromMonth(m: number): string {
  if (m <= 2 || m === 12) return 'Winter';
  if (m <= 5) return 'Summer';
  if (m <= 9) return 'Monsoon';
  return 'Post-Monsoon';
}

// Generate 800 realistic crime records seeded deterministically
export const MOCK_CRIMES: Crime[] = (() => {
  const rand = rng(42);
  const crimes: Crime[] = [];

  for (let i = 0; i < 800; i++) {
    const dist = pick(DISTRICTS, rand);
    const year = randInt(2022, 2025, rand);
    const month = randInt(1, 12, rand);
    const day = randInt(1, 28, rand);
    const hour = randInt(0, 23, rand);
    const weekday = new Date(year, month - 1, day).getDay();

    // Higher crime frequency in high-density cities
    const densityBias = ['Mumbai', 'Delhi', 'Bengaluru'].includes(dist.district);
    if (densityBias && rand() > 0.6) {
      // retry with same district
    }

    const crimeType = pick(CRIME_TYPES, rand);
    const severity = pick(SEVERITIES, rand);
    const status = pick(STATUSES, rand);

    crimes.push({
      id: `mock-${i}`,
      date: dateFromParts(year, month, day),
      crime_type: crimeType,
      district: dist.district,
      state: dist.state,
      latitude: dist.lat + (rand() - 0.5) * 0.4,
      longitude: dist.lng + (rand() - 0.5) * 0.4,
      severity,
      victims: randInt(1, 8, rand),
      status,
      year,
      month,
      day,
      weekday,
      hour,
      season: seasonFromMonth(month),
      description: `${crimeType} reported in ${dist.district} at ${hour}:00 hrs.`,
    });
  }

  return crimes.sort((a, b) => b.date.localeCompare(a.date));
})();

export const MOCK_PROFILES: Profile[] = [
  {
    id: 'demo-admin-001',
    email: 'admin@crimescope.ai',
    full_name: 'Demo Admin',
    role: 'admin',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'demo-analyst-001',
    email: 'analyst@crimescope.ai',
    full_name: 'Demo Analyst',
    role: 'analyst',
    created_at: '2024-03-01T00:00:00Z',
  },
];

export const MOCK_INSIGHTS: Insight[] = [
  {
    id: 'insight-1',
    title: 'Spike in Cybercrime Across Urban Districts',
    body: 'A 34% increase in cybercrime incidents has been detected across Mumbai, Bengaluru, and Hyderabad in the last 90 days. Financial fraud and phishing remain the dominant vectors. Recommend increased digital literacy campaigns.',
    category: 'Trend',
    severity: 'High',
    tags: ['cybercrime', 'urban', 'trend'],
    generated_at: '2025-06-15T10:00:00Z',
  },
  {
    id: 'insight-2',
    title: 'Vehicle Theft Hotspot: Pune Industrial Corridors',
    body: 'DBSCAN clustering identifies Pune industrial zones as a high-density vehicle theft hotspot with a 28% year-over-year increase. Peak times: 10 PM–2 AM. Patrol reallocation is recommended.',
    category: 'Hotspot',
    severity: 'Critical',
    tags: ['vehicle theft', 'Pune', 'hotspot'],
    generated_at: '2025-06-20T08:30:00Z',
  },
  {
    id: 'insight-3',
    title: 'Seasonal Crime Surge: Monsoon Pattern Detected',
    body: 'Historical data shows a consistent 18% surge in robbery and burglary during the Monsoon season (June–September) across West Bengal and Odisha. Deploying predictive patrols is advised.',
    category: 'Seasonal',
    severity: 'Medium',
    tags: ['monsoon', 'seasonal', 'robbery'],
    generated_at: '2025-07-01T09:00:00Z',
  },
  {
    id: 'insight-4',
    title: 'Arrest Rate Improvement in Delhi NCR',
    body: 'Arrest rates in Delhi NCR improved from 31% to 47% over the last quarter, attributed to enhanced inter-agency data sharing and AI-assisted suspect profiling.',
    category: 'Performance',
    severity: 'Low',
    tags: ['arrest rate', 'Delhi', 'performance'],
    generated_at: '2025-07-10T14:00:00Z',
  },
];

export const MOCK_REPORTS: ReportRecord[] = [
  {
    id: 'report-1',
    title: 'Q2 2025 Crime Summary – National Overview',
    scope: 'National',
    generated_by: 'admin@crimescope.ai',
    generated_at: '2025-07-01T08:00:00Z',
    summary: 'Total 12,450 incidents recorded in Q2 2025. Top crime: Theft (24%). Arrest rate: 38.5%. High-risk states: UP, Maharashtra, Bihar.',
  },
  {
    id: 'report-2',
    title: 'Hotspot Analysis – Mumbai Metropolitan Region',
    scope: 'District',
    generated_by: 'analyst@crimescope.ai',
    generated_at: '2025-06-15T12:00:00Z',
    summary: '7 active crime clusters detected in Mumbai MMR. Cluster #3 (Dharavi–Kurla) shows highest density with 85 incidents per km².',
  },
  {
    id: 'report-3',
    title: 'Cybercrime Quarterly Report – H1 2025',
    scope: 'Category',
    generated_by: 'admin@crimescope.ai',
    generated_at: '2025-06-30T16:00:00Z',
    summary: 'Cybercrime up 34% YoY. Financial fraud accounts for 52% of cases. Bengaluru, Mumbai, Hyderabad are top targets.',
  },
];

export const MOCK_DISTRICTS = DISTRICTS.map(({ district, state }) => ({ district, state }));

const LOCAL_STORAGE_KEY = 'crimescope_custom_incidents';

export function getPersistedCrimes(): Crime[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return MOCK_CRIMES;
    const custom: Crime[] = JSON.parse(raw);
    return [...custom, ...MOCK_CRIMES].sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return MOCK_CRIMES;
  }
}

export function saveMockIncident(crime: Omit<Crime, 'id'>): Crime {
  const newIncident: Crime = {
    ...crime,
    id: `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  };
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const existing: Crime[] = raw ? JSON.parse(raw) : [];
    existing.unshift(newIncident);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Ignore storage errors
  }
  return newIncident;
}

