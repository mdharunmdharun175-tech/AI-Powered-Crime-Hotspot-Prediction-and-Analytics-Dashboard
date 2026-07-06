import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import { useTheme } from '../../services/themeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const BRAND = '#2563eb';
const RISK_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];
const PALETTE = ['#2563eb', '#06b6d4', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

function useChartTheme() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return {
    grid: dark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.18)',
    ticks: dark ? '#94a3b8' : '#475569',
    legend: dark ? '#cbd5e1' : '#334155',
    tooltipBg: dark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
    tooltipTitle: dark ? '#e2e8f0' : '#0f172a',
    tooltipBody: dark ? '#cbd5e1' : '#334155',
  };
}

interface BaseProps {
  labels: string[];
  data: number[];
  label?: string;
  height?: number;
}

export function LineChart({ labels, data, label = 'Count', height = 260 }: BaseProps) {
  const t = useChartTheme();
  return (
    <div style={{ height }}>
      <Line
        data={{
          labels,
          datasets: [
            {
              label,
              data,
              borderColor: BRAND,
              backgroundColor: 'rgba(37,99,235,0.12)',
              fill: true,
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 3,
              pointHoverRadius: 6,
              pointBackgroundColor: BRAND,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: t.tooltipBg,
              titleColor: t.tooltipTitle,
              bodyColor: t.tooltipBody,
              borderColor: 'rgba(148,163,184,0.2)',
              borderWidth: 1,
              padding: 10,
              displayColors: false,
            },
          },
          scales: {
            x: { grid: { color: t.grid }, ticks: { color: t.ticks, font: { size: 11 } } },
            y: { grid: { color: t.grid }, ticks: { color: t.ticks, font: { size: 11 } }, beginAtZero: true },
          },
        }}
      />
    </div>
  );
}

export function MultiLineChart({
  labels,
  datasets,
  height = 280,
}: {
  labels: string[];
  datasets: { label: string; data: (number | null)[]; color: string }[];
  height?: number;
}) {
  const t = useChartTheme();
  return (
    <div style={{ height }}>
      <Line
        data={{
          labels,
          datasets: datasets.map((d) => ({
            label: d.label,
            data: d.data,
            borderColor: d.color,
            backgroundColor: d.color + '20',
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 5,
          })),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: t.legend, font: { size: 11 }, usePointStyle: true } },
            tooltip: { backgroundColor: t.tooltipBg, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody, padding: 10 },
          },
          scales: {
            x: { grid: { color: t.grid }, ticks: { color: t.ticks, font: { size: 11 } } },
            y: { grid: { color: t.grid }, ticks: { color: t.ticks, font: { size: 11 } }, beginAtZero: true },
          },
        }}
      />
    </div>
  );
}

export function BarChartH({ labels, data, label = 'Count', height = 280 }: BaseProps) {
  const t = useChartTheme();
  return (
    <div style={{ height }}>
      <Bar
        data={{
          labels,
          datasets: [
            {
              label,
              data,
              backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
              borderRadius: 6,
              maxBarThickness: 36,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: t.tooltipBg, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody, padding: 10, displayColors: false },
          },
          scales: {
            x: { grid: { color: t.grid }, ticks: { color: t.ticks, font: { size: 11 } }, beginAtZero: true },
            y: { grid: { display: false }, ticks: { color: t.ticks, font: { size: 11 } } },
          },
        }}
      />
    </div>
  );
}

export function BarChartV({ labels, data, label = 'Count', height = 260, colors }: BaseProps & { colors?: string[] }) {
  const t = useChartTheme();
  return (
    <div style={{ height }}>
      <Bar
        data={{
          labels,
          datasets: [
            {
              label,
              data,
              backgroundColor: colors ?? labels.map((_, i) => PALETTE[i % PALETTE.length]),
              borderRadius: 6,
              maxBarThickness: 42,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: t.tooltipBg, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody, padding: 10, displayColors: false },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: t.ticks, font: { size: 11 } } },
            y: { grid: { color: t.grid }, ticks: { color: t.ticks, font: { size: 11 } }, beginAtZero: true },
          },
        }}
      />
    </div>
  );
}

export function DoughnutChart({ labels, data, height = 260 }: Omit<BaseProps, 'label'>) {
  const t = useChartTheme();
  return (
    <div style={{ height }}>
      <Doughnut
        data={{
          labels,
          datasets: [
            {
              data,
              backgroundColor: labels.map((_, i) => RISK_COLORS[i % RISK_COLORS.length]),
              borderColor: 'transparent',
              borderWidth: 2,
              hoverOffset: 8,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: { position: 'right', labels: { color: t.legend, font: { size: 11 }, usePointStyle: true, padding: 12 } },
            tooltip: { backgroundColor: t.tooltipBg, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody, padding: 10 },
          },
        }}
      />
    </div>
  );
}

export function PieChart({ labels, data, height = 260 }: Omit<BaseProps, 'label'>) {
  const t = useChartTheme();
  return (
    <div style={{ height }}>
      <Pie
        data={{
          labels,
          datasets: [
            {
              data,
              backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
              borderColor: 'transparent',
              borderWidth: 2,
              hoverOffset: 8,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: t.legend, font: { size: 11 }, usePointStyle: true, padding: 12 } },
            tooltip: { backgroundColor: t.tooltipBg, titleColor: t.tooltipTitle, bodyColor: t.tooltipBody, padding: 10 },
          },
        }}
      />
    </div>
  );
}
