import type { Crime, Insight } from './types';

const sevScore = (s: string) =>
  s === 'Critical' ? 4 : s === 'High' ? 3 : s === 'Medium' ? 2 : 1;

function pctChange(curr: number, prev: number): number {
  if (!prev) return curr ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

/**
 * Rule-based AI insight generator.
 * Produces templated natural-language insights from crime data.
 */
export function generateInsights(crimes: Crime[]): Insight[] {
  if (crimes.length === 0) return [];
  const insights: Insight[] = [];
  const now = new Date();
  const idPrefix = now.getTime();

  const years = [...new Set(crimes.map((c) => c.year))].sort();
  const lastYear = years[years.length - 1];
  const prevYear = years[years.length - 2];

  // 1. Crime type YoY growth — flag rising categories
  const typeByYear = new Map<string, Map<number, number>>();
  for (const c of crimes) {
    if (!typeByYear.has(c.crime_type)) typeByYear.set(c.crime_type, new Map());
    const m = typeByYear.get(c.crime_type)!;
    m.set(c.year, (m.get(c.year) ?? 0) + 1);
  }
  for (const [type, yearMap] of typeByYear) {
    const curr = yearMap.get(lastYear) ?? 0;
    const prev = prevYear ? yearMap.get(prevYear) ?? 0 : 0;
    const change = pctChange(curr, prev);
    if (change > 15 && curr > 20) {
      insights.push({
        id: `ins-${idPrefix}-type-${type}`,
        title: `${type} up ${Math.round(change)}% year-over-year`,
        body: `${type} incidents rose by ${Math.round(change)}% from ${prevYear} to ${lastYear} (${prev} → ${curr} cases). Consider targeted enforcement and awareness campaigns in affected districts.`,
        category: 'Trend',
        severity: change > 40 ? 'High' : 'Medium',
        tags: [type, 'YoY', lastYear.toString()],
        generated_at: now.toISOString(),
      });
    } else if (change < -20 && curr > 20) {
      insights.push({
        id: `ins-${idPrefix}-type-${type}-down`,
        title: `${type} declined ${Math.abs(Math.round(change))}% year-over-year`,
        body: `${type} incidents fell by ${Math.abs(Math.round(change))}% from ${prevYear} to ${lastYear} (${prev} → ${curr} cases). Sustained community policing and enforcement appear effective — maintain current strategy.`,
        category: 'Trend',
        severity: 'Low',
        tags: [type, 'YoY', lastYear.toString()],
        generated_at: now.toISOString(),
      });
    }
  }

  // 2. High-risk districts (severity + volume)
  const byDistrict = new Map<string, Crime[]>();
  for (const c of crimes) {
    if (!byDistrict.has(c.district)) byDistrict.set(c.district, []);
    byDistrict.get(c.district)!.push(c);
  }
  const districtScores = [...byDistrict.entries()]
    .map(([d, dc]) => ({
      district: d,
      state: dc[0].state,
      avgSev: dc.reduce((s, c) => s + sevScore(c.severity), 0) / dc.length,
      count: dc.length,
    }))
    .sort((a, b) => b.avgSev * b.count - a.avgSev * a.count);

  const top3 = districtScores.slice(0, 3);
  for (const d of top3) {
    if (d.avgSev >= 2.8) {
      insights.push({
        id: `ins-${idPrefix}-dist-${d.district}`,
        title: `${d.district} identified as a high-risk zone`,
        body: `${d.district}, ${d.state} shows an average severity of ${d.avgSev.toFixed(2)}/4 across ${d.count} incidents. Increased surveillance and resource deployment are recommended.`,
        category: 'Hotspot',
        severity: d.avgSev >= 3.2 ? 'Critical' : 'High',
        tags: [d.district, d.state, 'High Risk'],
        generated_at: now.toISOString(),
      });
    }
  }

  // 3. Time-of-day patterns — nighttime surge
  const nightCrimes = crimes.filter((c) => c.hour >= 18 || c.hour < 5);
  const nightPct = (nightCrimes.length / crimes.length) * 100;
  if (nightPct > 40) {
    insights.push({
      id: `ins-${idPrefix}-night`,
      title: 'Crime rates increase during nighttime hours',
      body: `${nightPct.toFixed(0)}% of recorded incidents occur between 6 PM and 5 AM. Recommend enhanced night patrols, improved street lighting in high-incident corridors, and after-hours community vigilance programs.`,
      category: 'Pattern',
      severity: 'High',
      tags: ['Time', 'Night', 'Patrol'],
      generated_at: now.toISOString(),
    });
  }

  // 4. Weekday patterns — vehicle theft peaks on weekends
  const weekend = crimes.filter((c) => c.weekday === 0 || c.weekday === 6);
  const weekendPct = (weekend.length / crimes.length) * 100;
  const vehicleWeekend = crimes.filter(
    (c) => c.crime_type === 'Vehicle Theft' && (c.weekday === 0 || c.weekday === 6),
  );
  const vehicleTotal = crimes.filter((c) => c.crime_type === 'Vehicle Theft').length;
  if (vehicleTotal > 0 && vehicleWeekend.length / vehicleTotal > 0.35) {
    insights.push({
      id: `ins-${idPrefix}-vehicle-weekend`,
      title: 'Vehicle theft peaks during weekends',
      body: `${((vehicleWeekend.length / vehicleTotal) * 100).toFixed(0)}% of vehicle thefts occur on weekends (${vehicleWeekend.length} of ${vehicleTotal} cases). Deploy dedicated weekend anti-theft squads and increase parking-lot patrols in commercial zones.`,
      category: 'Pattern',
      severity: 'Medium',
      tags: ['Vehicle Theft', 'Weekend', 'Pattern'],
      generated_at: now.toISOString(),
    });
  }
  if (weekendPct > 35) {
    insights.push({
      id: `ins-${idPrefix}-weekend`,
      title: 'Weekend crime volume elevated',
      body: `Weekends account for ${weekendPct.toFixed(0)}% of all incidents. Concentrate patrol strength and emergency response readiness on Saturday and Sunday shifts.`,
      category: 'Pattern',
      severity: 'Medium',
      tags: ['Weekend', 'Patrol'],
      generated_at: now.toISOString(),
    });
  }

  // 5. Seasonal patterns
  const bySeason = new Map<string, number>();
  for (const c of crimes) bySeason.set(c.season, (bySeason.get(c.season) ?? 0) + 1);
  const seasonSorted = [...bySeason.entries()].sort((a, b) => b[1] - a[1]);
  if (seasonSorted.length > 1 && seasonSorted[0][1] > crimes.length * 0.32) {
    insights.push({
      id: `ins-${idPrefix}-season`,
      title: `${seasonSorted[0][0]} sees the highest crime volume`,
      body: `${seasonSorted[0][0]} accounts for ${((seasonSorted[0][1] / crimes.length) * 100).toFixed(0)}% of incidents (${seasonSorted[0][1]} cases). Plan seasonal resource allocation and proactive community outreach ahead of this period.`,
      category: 'Seasonal',
      severity: 'Medium',
      tags: ['Season', seasonSorted[0][0]],
      generated_at: now.toISOString(),
    });
  }

  // 6. Surveillance recommendation for top district
  if (top3[0]) {
    insights.push({
      id: `ins-${idPrefix}-surv-${top3[0].district}`,
      title: `${top3[0].district} requires increased surveillance`,
      body: `${top3[0].district} leads the severity-weighted crime index at ${top3[0].avgSev.toFixed(2)}/4. Recommend CCTV expansion, dedicated investigation units, and weekly crime-review meetings for this district.`,
      category: 'Recommendation',
      severity: 'High',
      tags: [top3[0].district, 'Surveillance', 'Recommendation'],
      generated_at: now.toISOString(),
    });
  }

  // 7. Cybercrime specific (if rising)
  const cyber = typeByYear.get('Cybercrime');
  if (cyber) {
    const curr = cyber.get(lastYear) ?? 0;
    const prev = prevYear ? cyber.get(prevYear) ?? 0 : 0;
    if (curr > prev && curr > 15) {
      insights.push({
        id: `ins-${idPrefix}-cyber`,
        title: 'Cybercrime upward trend detected',
        body: `Cybercrime cases increased from ${prev} to ${curr} (${Math.round(pctChange(curr, prev))}%). Establish a dedicated cyber cell, train first responders on digital evidence handling, and launch public awareness on online fraud prevention.`,
        category: 'Trend',
        severity: 'High',
        tags: ['Cybercrime', 'Digital', 'Trend'],
        generated_at: now.toISOString(),
      });
    }
  }

  // 8. Arrest rate insight
  const arrests = crimes.filter((c) => c.status === 'Arrest Made').length;
  const arrestRate = (arrests / crimes.length) * 100;
  if (arrestRate < 25) {
    insights.push({
      id: `ins-${idPrefix}-arrest`,
      title: 'Case clearance rate below target',
      body: `Only ${arrestRate.toFixed(1)}% of cases resulted in an arrest. Investigative capacity bottlenecks likely exist. Recommend case-load rebalancing and prioritization of high-severity open cases.`,
      category: 'Operational',
      severity: 'High',
      tags: ['Arrest Rate', 'Operations'],
      generated_at: now.toISOString(),
    });
  } else {
    insights.push({
      id: `ins-${idPrefix}-arrest-good`,
      title: 'Healthy case clearance rate',
      body: `${arrestRate.toFixed(1)}% of cases resulted in an arrest — within the target band. Maintain investigative throughput and continue prioritizing high-severity cases.`,
      category: 'Operational',
      severity: 'Low',
      tags: ['Arrest Rate', 'Operations'],
      generated_at: now.toISOString(),
    });
  }

  return insights.sort((a, b) => sevScore(b.severity) - sevScore(a.severity));
}

/**
 * Generate actionable recommendations for authorities.
 */
export function generateRecommendations(crimes: Crime[]): { title: string; body: string; priority: string }[] {
  const recs: { title: string; body: string; priority: string }[] = [];
  const byDistrict = new Map<string, Crime[]>();
  for (const c of crimes) {
    if (!byDistrict.has(c.district)) byDistrict.set(c.district, []);
    byDistrict.get(c.district)!.push(c);
  }
  const ranked = [...byDistrict.entries()]
    .map(([d, dc]) => ({
      district: d,
      state: dc[0].state,
      avgSev: dc.reduce((s, c) => s + sevScore(c.severity), 0) / dc.length,
      count: dc.length,
    }))
    .sort((a, b) => b.avgSev * b.count - a.avgSev * a.count)
    .slice(0, 4);

  for (const r of ranked) {
    recs.push({
      title: `Prioritize ${r.district} for resource allocation`,
      body: `Severity-weighted index ${(r.avgSev * r.count / 100).toFixed(1)} (avg sev ${r.avgSev.toFixed(2)}, ${r.count} cases). Deploy ${r.avgSev >= 3 ? '2 additional patrol units' : '1 additional patrol unit'} and launch a 30-day focused operation.`,
      priority: r.avgSev >= 3 ? 'Critical' : 'High',
    });
  }

  const nightCrimes = crimes.filter((c) => c.hour >= 18 || c.hour < 5);
  if (nightCrimes.length / crimes.length > 0.4) {
    recs.push({
      title: 'Strengthen night-patrol coverage citywide',
      body: `${((nightCrimes.length / crimes.length) * 100).toFixed(0)}% of crimes occur at night. Add a third night-shift patrol rotation and install motion-activated lighting in identified dark corridors.`,
      priority: 'High',
    });
  }

  return recs;
}
