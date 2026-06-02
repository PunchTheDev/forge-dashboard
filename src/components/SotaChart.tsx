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
import { Submission, Spec, metricConfig } from "../lib/api";

interface Props {
  submissions: Submission[];
  spec: Spec;
}

interface ChartPoint {
  date: string;
  score: number;
  contributor: string;
}

function buildSotaCurve(submissions: Submission[], direction: string): ChartPoint[] {
  const passed = submissions
    .filter((s) => s.passed)
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

  const points: ChartPoint[] = [];
  const scoreOf = (s: Submission) => s.score ?? s.mass_grams;
  let best = direction === "maximize" ? -Infinity : Infinity;

  for (const s of passed) {
    const score = scoreOf(s);
    const improved = direction === "maximize" ? score > best : score < best;
    if (improved) {
      best = score;
      points.push({
        date: new Date(s.submitted_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        score: parseFloat(score.toFixed(4)),
        contributor: s.contributor,
      });
    }
  }

  return points;
}

interface TooltipPayload {
  payload: {
    score: number;
    contributor: string;
    date: string;
  };
}

function CustomTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-forge-bg border border-forge-border rounded-lg px-3 py-2 text-sm">
      <div className="text-forge-green font-mono font-semibold">
        {d.score}
        {unit}
      </div>
      <div className="text-forge-muted">{d.contributor}</div>
      <div className="text-forge-muted text-xs">{d.date}</div>
    </div>
  );
}

export function SotaChart({ submissions, spec }: Props) {
  const direction = spec.scoring.direction;
  const metric = spec.scoring.metric;
  const unit = metricConfig(metric).unit;
  const points = buildSotaCurve(submissions, direction);

  if (points.length === 0) {
    return (
      <div className="bg-forge-surface border border-forge-border rounded-xl px-4 py-8 text-center text-forge-muted text-sm">
        No data yet — first submission sets the baseline.
      </div>
    );
  }

  const currentSota = points[points.length - 1].score;

  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-forge-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">SOTA over time</h2>
        <span className="font-mono text-forge-green text-sm font-semibold">
          {currentSota}
          {unit}
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
              unit={unit}
              width={65}
            />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <ReferenceLine
              y={currentSota}
              stroke="#6366f1"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Line
              type="stepAfter"
              dataKey="score"
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
