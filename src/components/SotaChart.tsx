import { useCallback } from "react";
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
import { useApi } from "../hooks/useApi";
import { api, Spec, SotaHistoryPoint, metricConfig } from "../lib/api";

interface Props {
  spec: Spec;
}

interface ChartPoint {
  date: string;
  score: number;
  contributor: string;
}

function toChartPoints(history: SotaHistoryPoint[]): ChartPoint[] {
  return history.map((h) => ({
    date: new Date(h.submitted_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    score: parseFloat(h.score.toFixed(4)),
    contributor: h.contributor,
  }));
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

export function SotaChart({ spec }: Props) {
  const metric = spec.scoring.metric;
  const direction = spec.scoring.direction;
  const unit = metricConfig(metric).unit;

  const fetcher = useCallback(() => api.sotaHistory(spec.id), [spec.id]);
  const { data: history, loading } = useApi(fetcher, 15000);

  if (loading) {
    return (
      <div className="bg-forge-surface border border-forge-border rounded-xl px-4 py-8 text-center text-forge-muted text-sm">
        Loading…
      </div>
    );
  }

  const points = toChartPoints(history ?? []);

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
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white">SOTA over time</h2>
          <span className="text-xs text-forge-muted">
            {direction === "minimize" ? "↓ lower is better" : "↑ higher is better"}
          </span>
        </div>
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
              domain={[0, "auto"]}
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
