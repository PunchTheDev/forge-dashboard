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
import { api, Spec, SotaHistoryPoint, metricConfig, specBaseline } from "../lib/api";

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

// Smart y-axis domain: centers on actual data. Includes the reference line in
// the visible range only when it's within 5× of the data — otherwise the ref
// is shown as a clipped annotation while the chart stays readable around the data.
function smartDomain(
  _direction: string,
  baseline: number | null,
): [(dataMin: number) => number, (dataMax: number) => number] {
  return [
    (dataMin: number) => {
      // Include reference only if within 5× of the data point
      const includeRef = baseline != null && baseline > 0 &&
        Math.max(dataMin, baseline) / Math.min(dataMin, baseline) <= 5;
      const low = includeRef ? Math.min(dataMin, baseline!) : dataMin;
      const high = includeRef ? Math.max(dataMin, baseline!) : dataMin;
      const range = high - low;
      const pad = range > 0 ? range * 0.15 : Math.abs(low) * 0.15 || 1;
      return Math.max(0, low - pad);
    },
    (dataMax: number) => {
      const includeRef = baseline != null && baseline > 0 &&
        Math.max(dataMax, baseline) / Math.min(dataMax, baseline) <= 5;
      const high = includeRef ? Math.max(dataMax, baseline!) : dataMax;
      const low = includeRef ? Math.min(dataMax, baseline!) : dataMax;
      const range = high - low;
      const pad = range > 0 ? range * 0.15 : Math.abs(high) * 0.15 || 1;
      return high + pad;
    },
  ];
}

export function SotaChart({ spec }: Props) {
  const metric = spec.scoring.metric;
  const direction = spec.scoring.direction;
  const { unit, decimals } = metricConfig(metric);
  const baseline = specBaseline(spec.scoring);

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

  // Single submission — a line chart needs at least 2 points to be meaningful
  if (points.length === 1) {
    const p = points[0];
    const { label } = metricConfig(metric);
    const beatsSeed = baseline != null && (
      direction === "minimize" ? p.score < baseline : p.score > baseline
    );
    return (
      <div className="bg-forge-surface border border-forge-border rounded-xl px-4 py-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">SOTA over time</h2>
          <span className="text-xs text-forge-muted">1 submission</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-forge-green/15 border border-forge-green/30 flex items-center justify-center text-forge-green text-xs font-bold">
            #1
          </div>
          <div>
            <div className="font-mono text-forge-green font-semibold">
              {p.score}{unit}
            </div>
            <div className="text-xs text-forge-muted mt-0.5">
              First {label.toLowerCase()} by <span className="text-white">{p.contributor}</span> · {p.date}
            </div>
          </div>
        </div>
        {baseline != null && (
          <div className="mt-3 text-xs text-forge-muted border-t border-forge-border/30 pt-2">
            vs. maintainer's baseline: {baseline.toFixed(decimals)}{unit}
            {" · "}
            <span className={beatsSeed ? "text-forge-green" : "text-amber-400"}>
              {beatsSeed ? "beats reference" : "reference still leads — fork and improve it"}
            </span>
          </div>
        )}
      </div>
    );
  }

  const currentSota = points[points.length - 1].score;
  const domain = smartDomain(direction, baseline);

  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-forge-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white">SOTA over time</h2>
          <span className="text-xs text-forge-muted">
            {direction === "minimize" ? "↓ lower is better" : "↑ higher is better"}
          </span>
          {baseline != null && (
            <span className="text-xs text-forge-muted">
              · ref: {baseline.toFixed(decimals)}{unit}
            </span>
          )}
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
              domain={domain}
              width={65}
              label={{
                value: unit ? unit : metric.replace(/_/g, " "),
                angle: -90,
                position: "insideLeft",
                fill: "#6b7280",
                fontSize: 9,
                offset: 8,
              }}
              tickFormatter={(v: number) => {
                if (v >= 100) return v.toFixed(0);
                if (v >= 1)   return v.toFixed(2);
                return v.toFixed(4);
              }}
            />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            {baseline != null && (
              <ReferenceLine
                y={baseline}
                stroke="#6b7280"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{ value: "ref", position: "right", fill: "#6b7280", fontSize: 10 }}
              />
            )}
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
