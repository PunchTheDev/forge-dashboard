import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Submission } from "../lib/api";

interface Props {
  submissions: Submission[];
  specId: string;
}

interface ChartPoint {
  date: string;
  mass: number;
  contributor: string;
}

function buildSotaCurve(submissions: Submission[]): ChartPoint[] {
  const passed = submissions
    .filter((s) => s.passed)
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

  const points: ChartPoint[] = [];
  let best = Infinity;

  for (const s of passed) {
    if (s.mass_grams < best) {
      best = s.mass_grams;
      points.push({
        date: new Date(s.submitted_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        mass: parseFloat(s.mass_grams.toFixed(2)),
        contributor: s.contributor,
      });
    }
  }

  return points;
}

interface TooltipPayload {
  payload: {
    mass: number;
    contributor: string;
    date: string;
  };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-sm">
      <div className="text-forge-green font-mono font-semibold">{d.mass}g</div>
      <div className="text-forge-muted">{d.contributor}</div>
      <div className="text-forge-muted text-xs">{d.date}</div>
    </div>
  );
}

export function SotaChart({ submissions }: Props) {
  const points = buildSotaCurve(submissions);

  if (points.length === 0) {
    return (
      <div className="bg-forge-surface border border-forge-border rounded-xl px-4 py-8 text-center text-forge-muted text-sm">
        No data yet — first submission sets the baseline.
      </div>
    );
  }

  const currentSota = points[points.length - 1].mass;

  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-forge-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">SOTA over time</h2>
        <span className="font-mono text-forge-green text-sm font-semibold">
          {currentSota}g
        </span>
      </div>
      <div className="px-2 py-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
              unit="g"
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={currentSota}
              stroke="#6366f1"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Line
              type="stepAfter"
              dataKey="mass"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 4 }}
              activeDot={{ r: 6, fill: "#6366f1" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
