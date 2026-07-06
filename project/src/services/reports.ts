import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AnalyticsSummary, DistrictRanking, Insight, Crime } from './types';
import { formatNumber } from './utils';

export function exportCrimesToCsv(crimes: Crime[], filename = 'crimes_export.csv') {
  if (!crimes.length) return;
  const headers = [
    'Date', 'Crime Type', 'District', 'State', 'Latitude', 'Longitude',
    'Severity', 'Victims', 'Status', 'Hour', 'Season',
  ];
  const rows = crimes.map((c) => [
    c.date, c.crime_type, c.district, c.state, c.latitude, c.longitude,
    c.severity, c.victims, c.status, c.hour, c.season,
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  downloadBlob(csv, filename, 'text/csv;charset=utf-8;');
}

export function exportAnalyticsReport(
  summary: AnalyticsSummary,
  rankings: DistrictRanking[],
  insights: Insight[],
  scope: string,
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CrimeScope AI — Analytics Report', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Scope: ${scope}  |  Generated: ${new Date().toLocaleString('en-IN')}`, 14, 19);
  doc.text(`Total Crimes: ${formatNumber(summary.total_crimes)}  |  Active: ${formatNumber(summary.active_cases)}  |  Arrest Rate: ${summary.arrest_rate.toFixed(1)}%`, 14, 25);

  doc.setTextColor(15, 23, 42);
  let y = 38;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const exec = [
    `Total crimes analyzed: ${formatNumber(summary.total_crimes)}`,
    `Active cases (open + under investigation): ${formatNumber(summary.active_cases)}`,
    `Closed cases: ${formatNumber(summary.closed_cases)}  |  Arrest rate: ${summary.arrest_rate.toFixed(1)}%`,
    `Total victims affected: ${formatNumber(summary.total_victims)}`,
    `High-risk districts identified: ${formatNumber(summary.high_risk_districts)}`,
    `Top crime category: ${summary.top_crime_type}`,
  ];
  exec.forEach((line) => { doc.text(line, 14, y); y += 5; });
  y += 4;

  // District ranking table
  autoTable(doc, {
    startY: y,
    head: [['District', 'State', 'Total Crimes', 'Severity Score', 'Risk', 'YoY %']],
    body: rankings.slice(0, 12).map((r) => [
      r.district, r.state, formatNumber(r.total_crimes),
      r.severity_score.toString(), r.risk_level,
      `${r.yoy_change_pct >= 0 ? '+' : ''}${r.yoy_change_pct.toFixed(1)}`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });
  // @ts-expect-error — autoTable adds lastAutoTable at runtime
  y = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Crime type breakdown
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Crime Type Distribution', 14, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [['Crime Type', 'Count', 'Share %']],
    body: summary.crime_types.map((t) => [
      t.type, formatNumber(t.count), t.pct.toFixed(1) + '%',
    ]),
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });
  // @ts-expect-error — autoTable adds lastAutoTable at runtime
  y = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Insights
  if (doc.internal.pageSize.getHeight() - y < 40) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('AI-Generated Insights', 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  insights.slice(0, 8).forEach((ins) => {
    if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.text(`• ${ins.title}  [${ins.severity}]`, 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(ins.body, pageWidth - 28);
    doc.text(lines, 16, y);
    y += lines.length * 5 + 3;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `CrimeScope AI  |  Page ${i} of ${pageCount}  |  Confidential`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    );
  }

  doc.save(`crimescope_report_${scope.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.pdf`);
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
