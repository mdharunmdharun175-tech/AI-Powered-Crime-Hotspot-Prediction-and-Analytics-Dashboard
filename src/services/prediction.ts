import type {
  Crime,
  CrimeType,
  CrimeSeverity,
  PredictionResult,
  ForecastPoint,
  DistrictRanking,
  ModelEvaluation,
  RiskLevel,
} from './types';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const sevScore = (s: CrimeSeverity) =>
  s === 'Critical' ? 4 : s === 'High' ? 3 : s === 'Medium' ? 2 : 1;

const sevFromScore = (s: number): CrimeSeverity =>
  s >= 3.5 ? 'Critical' : s >= 2.5 ? 'High' : s >= 1.5 ? 'Medium' : 'Low';

const riskFromScore = (s: number): RiskLevel => (s >= 3 ? 'High' : s >= 2 ? 'Medium' : 'Low');

/**
 * Naive-Bayes-style crime occurrence model.
 * Trains on historical (district x crime_type x weekday x hour x season) features
 * and predicts the most likely crime category, severity, and occurrence probability.
 */
export function trainOccurrenceModel(crimes: Crime[]) {
  const total = crimes.length;
  const typePrior = new Map<CrimeType, number>();
  const cond = {
    district: new Map<string, Map<CrimeType, number>>(),
    hour: new Map<number, Map<CrimeType, number>>(),
    weekday: new Map<number, Map<CrimeType, number>>(),
    season: new Map<string, Map<CrimeType, number>>(),
  };
  const sevByType = new Map<CrimeType, number[]>();

  for (const c of crimes) {
    typePrior.set(c.crime_type, (typePrior.get(c.crime_type) ?? 0) + 1);

    const inc = <K>(m: Map<K, Map<CrimeType, number>>, key: K) => {
      if (!m.has(key)) m.set(key, new Map());
      const inner = m.get(key)!;
      inner.set(c.crime_type, (inner.get(c.crime_type) ?? 0) + 1);
    };
    inc(cond.district, c.district);
    inc(cond.hour, c.hour);
    inc(cond.weekday, c.weekday);
    inc(cond.season, c.season);

    if (!sevByType.has(c.crime_type)) sevByType.set(c.crime_type, []);
    sevByType.get(c.crime_type)!.push(sevScore(c.severity));
  }

  const predict = (features: {
    district: string;
    hour: number;
    weekday: number;
    season: string;
  }): PredictionResult => {
    const scores = new Map<CrimeType, number>();
    const types = [...typePrior.keys()];

    for (const t of types) {
      const prior = (typePrior.get(t) ?? 0) / (total || 1);
      let logProb = Math.log(prior || 1e-6);

      const laplace = <K>(m: Map<K, Map<CrimeType, number>> | undefined, key: K) => {
        if (!m) return Math.log(1e-6);
        const inner = m.get(key);
        const n = inner?.get(t) ?? 0;
        const denom = inner ? [...inner.values()].reduce((a, b) => a + b, 0) : 0;
        return Math.log((n + 1) / (denom + types.length));
      };

      logProb += laplace(cond.district, features.district);
      logProb += laplace(cond.hour, features.hour);
      logProb += laplace(cond.weekday, features.weekday);
      logProb += laplace(cond.season, features.season);

      scores.set(t, logProb);
    }

    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const best = sorted[0];
    const crime_type = best[0];

    // softmax over top-k for probability
    const topK = sorted.slice(0, Math.min(5, sorted.length));
    const maxLog = topK[0][1];
    const exps = topK.map(([, l]) => Math.exp(l - maxLog));
    const sumExp = exps.reduce((a, b) => a + b, 0);
    const probability = exps[0] / sumExp;

    const sevArr = sevByType.get(crime_type) ?? [2];
    const avgSev = sevArr.reduce((a, b) => a + b, 0) / sevArr.length;
    const severity = sevFromScore(avgSev);

    return {
      crime_type,
      severity,
      probability,
      confidence: probability,
    };
  };

  return { predict, typePrior };
}

/**
 * Evaluate the occurrence model on a held-out slice (last 20% by date).
 */
export function evaluateOccurrenceModel(crimes: Crime[]): ModelEvaluation {
  if (crimes.length < 50) {
    return { accuracy: 0, precision: 0, recall: 0, f1: 0, support: 0, confusion: {} };
  }
  const sorted = [...crimes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const splitIdx = Math.floor(sorted.length * 0.8);
  const train = sorted.slice(0, splitIdx);
  const test = sorted.slice(splitIdx);
  const model = trainOccurrenceModel(train);

  const confusion: Record<string, Record<string, number>> = {};
  let correct = 0;
  const typeTP = new Map<string, number>();
  const typeFP = new Map<string, number>();
  const typeFN = new Map<string, number>();

  for (const c of test) {
    const pred = model.predict({
      district: c.district,
      hour: c.hour,
      weekday: c.weekday,
      season: c.season,
    });
    const actual = c.crime_type;
    const predicted = pred.crime_type;
    if (!confusion[actual]) confusion[actual] = {};
    confusion[actual][predicted] = (confusion[actual][predicted] ?? 0) + 1;
    if (predicted === actual) {
      correct++;
      typeTP.set(actual, (typeTP.get(actual) ?? 0) + 1);
    } else {
      typeFP.set(predicted, (typeFP.get(predicted) ?? 0) + 1);
      typeFN.set(actual, (typeFN.get(actual) ?? 0) + 1);
    }
  }

  const types = new Set([...typeTP.keys(), ...typeFP.keys(), ...typeFN.keys()]);
  let precSum = 0, recSum = 0, f1Sum = 0, count = 0;
  for (const t of types) {
    const tp = typeTP.get(t) ?? 0;
    const fp = typeFP.get(t) ?? 0;
    const fn = typeFN.get(t) ?? 0;
    const p = tp / (tp + fp || 1);
    const r = tp / (tp + fn || 1);
    const f1 = (2 * p * r) / (p + r || 1);
    precSum += p; recSum += r; f1Sum += f1; count++;
  }

  return {
    accuracy: correct / test.length,
    precision: count ? precSum / count : 0,
    recall: count ? recSum / count : 0,
    f1: count ? f1Sum / count : 0,
    support: test.length,
    confusion,
  };
}

/**
 * Linear-regression-based future monthly crime forecast.
 * Returns historical points (null predicted) + forecast points with confidence band.
 */
export function forecastMonthlyTrend(
  crimes: Crime[],
  forecastMonths = 6,
): ForecastPoint[] {
  const monthly = new Map<string, number>();
  for (const c of crimes) {
    const k = `${c.year}-${String(c.month).padStart(2, '0')}`;
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
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  // residual std for confidence band
  const residuals = ys.map((y, i) => y - (slope * xs[i] + intercept));
  const residStd = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / (n - 2 || 1));
  const band = 1.96 * residStd;

  const points: ForecastPoint[] = sorted.map(([k, v], i) => {
    const [, m] = k.split('-');
    return {
      label: `${MONTH_LABELS[parseInt(m) - 1]} ${k.slice(0, 4)}`,
      historical: v,
      predicted: Math.max(0, Math.round(slope * i + intercept)),
      lower: 0,
      upper: 0,
    };
  });

  const lastKey = sorted[sorted.length - 1][0];
  const [lastY, lastM] = lastKey.split('-').map(Number);
  let curY = lastY;
  let curM = lastM;
  for (let f = 1; f <= forecastMonths; f++) {
    curM++;
    if (curM > 12) { curM = 1; curY++; }
    const xIdx = n + f - 1;
    const pred = Math.max(0, Math.round(slope * xIdx + intercept));
    points.push({
      label: `${MONTH_LABELS[curM - 1]} ${curY}`,
      historical: null,
      predicted: pred,
      lower: Math.max(0, Math.round(pred - band)),
      upper: Math.round(pred + band),
    });
  }

  return points;
}

/**
 * District-wise future forecast using linear regression per district.
 */
export function forecastByDistrict(
  crimes: Crime[],
  district: string,
  forecastMonths = 6,
): ForecastPoint[] {
  const distCrimes = crimes.filter((c) => c.district === district);
  return forecastMonthlyTrend(distCrimes, forecastMonths);
}

/**
 * Rank districts by crime severity score + volume, with YoY trend.
 */
export function rankDistricts(crimes: Crime[]): DistrictRanking[] {
  const byDistrict = new Map<string, Crime[]>();
  for (const c of crimes) {
    if (!byDistrict.has(c.district)) byDistrict.set(c.district, []);
    byDistrict.get(c.district)!.push(c);
  }

  const years = [...new Set(crimes.map((c) => c.year))].sort();
  const lastYear = years[years.length - 1] ?? 0;
  const prevYear = years[years.length - 2] ?? lastYear;

  const rankings: DistrictRanking[] = [];
  for (const [district, distCrimes] of byDistrict) {
    const total_crimes = distCrimes.length;
    const avgSev = distCrimes.reduce((s, c) => s + sevScore(c.severity), 0) / total_crimes;
    const severity_score = Math.round((avgSev * total_crimes) / 100);
    const risk_level = riskFromScore(avgSev);

    const lastYearCount = distCrimes.filter((c) => c.year === lastYear).length;
    const prevYearCount = distCrimes.filter((c) => c.year === prevYear).length;
    const yoy_change_pct = prevYearCount
      ? ((lastYearCount - prevYearCount) / prevYearCount) * 100
      : 0;
    const trend_direction: 'up' | 'down' | 'flat' =
      Math.abs(yoy_change_pct) < 5 ? 'flat' : yoy_change_pct > 0 ? 'up' : 'down';

    rankings.push({
      district,
      state: distCrimes[0]?.state ?? '',
      total_crimes,
      severity_score,
      risk_level,
      trend_direction,
      yoy_change_pct,
    });
  }

  return rankings.sort((a, b) => b.severity_score - a.severity_score);
}
