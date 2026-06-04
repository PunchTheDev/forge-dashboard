import { Spec, metricConfig, MATERIAL_META } from "../lib/api";

interface Props {
  spec: Spec;
  /** When true, only renders the side view (no bolt pattern panel). */
  compact?: boolean;
}

const MATERIAL_COLOR: Record<string, string> = {
  pla: "#4ade80",
  petg: "#60a5fa",
  aluminum_6061: "#c4b5fd",
  stainless_316: "#94a3b8",
  steel_mild: "#78716c",
};

function fmt(v: number, dec = 1) {
  return v.toFixed(dec);
}

/** Compact 2-panel SVG diagram: side view (XZ) + front view (YZ bolt pattern). */
export function SpecDiagram({ spec, compact = false }: Props) {
  const c = spec.constraints;
  const [bvx, , bvz] = c.build_volume_mm;
  const [lx, , lz] = c.load_point_mm;
  const boltBys = c.bolt_pattern_mm.map((p) => p[0]);
  const boltBzs = c.bolt_pattern_mm.map((p) => p[1]);
  const boltR = c.bolt_diameter_clearance_mm / 2;
  const color = MATERIAL_COLOR[spec.material] ?? "#94a3b8";

  // ── Side view (XZ) layout ───────────────────────────────────────────────────
  const SW = 220;   // side-view SVG width
  const SH = 160;   // side-view SVG height
  const sLpad = 28; // left pad (wall hatching)
  const sRpad = 16;
  const sVpad = 18;

  const scaleX = (SW - sLpad - sRpad) / bvx;
  const scaleZ = (SH - 2 * sVpad) / bvz;

  const svgX = (wx: number) => sLpad + wx * scaleX;
  const svgY = (wz: number) => SH - sVpad - wz * scaleZ;

  // Build volume rect
  const bvLeft = svgX(0);
  const bvRight = svgX(bvx);
  const bvTop = svgY(bvz);
  const bvBot = svgY(0);

  // Load point
  const lpX = svgX(lx);
  const lpZ = svgY(lz);

  // Bolt z range — show bolts as circles on the plate (x=0 side)
  const uniqueBzs = [...new Set(boltBzs)].sort((a, b) => a - b);
  const plateLeft = bvLeft - 6;
  const plateRight = bvLeft + 3;

  // Arm region: rough sketch — a bar from plate to near load point
  const armY0 = uniqueBzs.length > 0 ? svgY(Math.max(...uniqueBzs)) : bvTop;
  const armY1 = uniqueBzs.length > 0 ? svgY(Math.min(...uniqueBzs)) : bvBot;
  const armHeight = Math.max(4, armY1 - armY0);
  const armCenterZ = svgY(lz);
  const armHalfH = Math.min(12, armHeight / 3);

  // ── Front view (YZ bolt pattern) layout ────────────────────────────────────
  const FW = 100;
  const FH = 160;
  const fPad = 18;
  const byMin = Math.min(...boltBys);
  const byMax = Math.max(...boltBys);
  const bzMin = Math.min(...boltBzs);
  const bzMax = Math.max(...boltBzs);
  const byRange = byMax - byMin || 1;
  const bzRange = bzMax - bzMin || 1;
  const fScaleY = (FW - 2 * fPad) / byRange;
  const fScaleZ = (FH - 2 * fPad) / bzRange;
  const fScale = Math.min(fScaleY, fScaleZ) * 0.75;
  const fCX = FW / 2 - ((byMin + byMax) / 2) * fScale;
  const fCZ = FH / 2 + ((bzMin + bzMax) / 2) * fScale;

  const fX = (by: number) => fCX + by * fScale;
  const fY = (bz: number) => fCZ - bz * fScale;
  const fBoltR = Math.max(3.5, Math.min(8, boltR * fScale));

  const hatchLines = [];
  for (let i = -20; i < 40; i += 8) {
    hatchLines.push(
      <line
        key={i}
        x1={i}
        y1={0}
        x2={i + SH}
        y2={SH}
        stroke="#374151"
        strokeWidth={1}
      />,
    );
  }

  return (
    <div className="flex gap-4 items-start">
      {/* Side view */}
      <div className="flex-1">
        <div className="text-forge-muted text-xs mb-1 uppercase tracking-wider opacity-60">
          Side view
        </div>
        <svg
          viewBox={`0 0 ${SW} ${SH}`}
          className="w-full rounded-lg bg-forge-bg border border-forge-border/50"
          style={{ maxHeight: 160 }}
        >
          {/* Wall hatching */}
          <clipPath id={`wall-clip-${spec.id}`}>
            <rect x={0} y={0} width={sLpad} height={SH} />
          </clipPath>
          <g clipPath={`url(#wall-clip-${spec.id})`}>{hatchLines}</g>
          <rect x={0} y={0} width={sLpad - 2} height={SH} fill="#1f2937" opacity={0.7} />
          <line
            x1={sLpad - 2}
            y1={sVpad - 4}
            x2={sLpad - 2}
            y2={SH - sVpad + 4}
            stroke="#6b7280"
            strokeWidth={2}
          />

          {/* Build volume box */}
          <rect
            x={bvLeft}
            y={bvTop}
            width={bvRight - bvLeft}
            height={bvBot - bvTop}
            fill="none"
            stroke="#374151"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          {/* Build volume label — top-left corner of the dashed box, with actual dims */}
          <text
            x={bvLeft + 2}
            y={bvTop - 2}
            textAnchor="start"
            fill="#6b7280"
            fontSize={7}
            fontFamily="monospace"
          >
            {bvx.toFixed(0)}×{bvz.toFixed(0)}mm build vol.
          </text>

          {/* Arm sketch — simplified hollow box in material color */}
          <rect
            x={bvLeft}
            y={armCenterZ - armHalfH}
            width={lpX - bvLeft}
            height={armHalfH * 2}
            fill={color}
            fillOpacity={0.35}
            stroke={color}
            strokeWidth={1.5}
            strokeOpacity={0.9}
            rx={1}
          />

          {/* Plate (vertical bar at x=0) */}
          <rect
            x={plateLeft}
            y={bvTop}
            width={plateRight - plateLeft}
            height={bvBot - bvTop}
            fill={color}
            fillOpacity={0.35}
            stroke={color}
            strokeOpacity={0.6}
            strokeWidth={1}
          />

          {/* Bolt holes on plate */}
          {uniqueBzs.map((bz, i) => (
            <circle
              key={i}
              cx={bvLeft - 2}
              cy={svgY(bz)}
              r={Math.max(2.5, Math.min(5, boltR * scaleZ * 0.5))}
              fill="#111827"
              stroke="#6b7280"
              strokeWidth={1}
            />
          ))}

          {/* Load point */}
          <circle cx={lpX} cy={lpZ} r={4} fill={color} opacity={0.9} />
          {/* Load arrow (downward) with force label */}
          <line
            x1={lpX}
            y1={lpZ + 4}
            x2={lpX}
            y2={lpZ + 18}
            stroke={color}
            strokeWidth={2}
            markerEnd={`url(#arrow-${spec.id})`}
          />
          <text
            x={lpX + 5}
            y={lpZ + 16}
            fill={color}
            fontSize={7}
            fontFamily="monospace"
            opacity={0.85}
          >
            {fmt(c.load_newtons, 0)}N
          </text>
          <defs>
            <marker
              id={`arrow-${spec.id}`}
              markerWidth="6"
              markerHeight="6"
              refX="3"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" fill={color} />
            </marker>
          </defs>

          {/* Dimension labels */}
          <text
            x={svgX(lx / 2)}
            y={SH - 3}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize={9}
            fontFamily="monospace"
          >
            ←{lx.toFixed(0)}mm arm→
          </text>
          <text
            x={SW - 2}
            y={svgY(bvz / 2)}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#9ca3af"
            fontSize={9}
            fontFamily="monospace"
          >
            {bvz.toFixed(0)}mm
          </text>
          {/* Material label */}
          <text
            x={bvLeft + 4}
            y={armCenterZ - armHalfH - 3}
            fill={color}
            fontSize={7}
            fontFamily="monospace"
            opacity={0.8}
          >
            {MATERIAL_META[spec.material]?.label ?? spec.material.replace(/_/g, " ")}
          </text>
        </svg>
      </div>

      {/* Front view — bolt pattern (hidden in compact mode) */}
      {!compact && <div className="shrink-0">
        <div className="text-forge-muted text-xs mb-1 uppercase tracking-wider opacity-60">
          Front view — bolt pattern
        </div>
        <svg
          viewBox={`0 0 ${FW} ${FH}`}
          className="rounded-lg bg-forge-bg border border-forge-border/50"
          width={FW}
          height={FH}
        >
          {/* Plate background */}
          {c.bolt_pattern_mm.length > 0 && (
            <rect
              x={fX(byMin) - fBoltR - 6}
              y={fY(bzMax) - fBoltR - 6}
              width={
                fX(byMax) - fX(byMin) + (fBoltR + 6) * 2
              }
              height={
                fY(bzMin) - fY(bzMax) + (fBoltR + 6) * 2
              }
              fill={color}
              fillOpacity={0.12}
              stroke={color}
              strokeOpacity={0.3}
              strokeWidth={1}
              rx={2}
            />
          )}

          {/* Load point center (projected onto plate) */}
          {(() => {
            const [, ly] = c.load_point_mm;
            const cx = fX(ly);
            const cy = fCZ - lz * fScale;
            return (
              <>
                <circle
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={color}
                  opacity={0.5}
                  strokeDasharray="2 2"
                  stroke={color}
                />
                <text
                  x={cx + 7}
                  y={cy + 3}
                  fill={color}
                  fontSize={6}
                  fontFamily="monospace"
                  opacity={0.7}
                >
                  load
                </text>
              </>
            );
          })()}

          {/* Bolt holes */}
          {c.bolt_pattern_mm.map(([by, bz], i) => (
            <g key={i}>
              <circle
                cx={fX(by)}
                cy={fY(bz)}
                r={fBoltR}
                fill="#111827"
                stroke="#6b7280"
                strokeWidth={1.5}
              />
              <circle
                cx={fX(by)}
                cy={fY(bz)}
                r={fBoltR * 0.35}
                fill="#374151"
              />
            </g>
          ))}

          {/* Labels */}
          <text
            x={FW / 2}
            y={FH - 4}
            textAnchor="middle"
            fill="#4b5563"
            fontSize={7}
            fontFamily="monospace"
          >
            {c.bolt_pattern_mm.length} × M{(c.bolt_diameter_clearance_mm - 0.5).toFixed(0)}
          </text>
        </svg>
      </div>}

      {/* Constraint stats — shown when not compact */}
      {!compact && (
        <div className="w-full mt-2 grid grid-cols-3 gap-x-4 gap-y-1 text-xs font-mono text-forge-muted border-t border-forge-border/30 pt-2">
          <span title="Applied load force">
            <span className="text-forge-text/50">load </span>
            <span style={{ color }}>{fmt(c.load_newtons, 0)} N ({fmt(c.load_newtons / 9.81, 1)} kg)</span>
          </span>
          <span title="Safety factor applied to allowable stress">
            <span className="text-forge-text/50">SF </span>
            <span className="text-white">{c.safety_factor}×</span>
          </span>
          <span title="Build volume bounding box">
            <span className="text-forge-text/50">vol </span>
            <span className="text-white">{fmt(c.build_volume_mm[0], 0)}×{fmt(c.build_volume_mm[1], 0)}×{fmt(c.build_volume_mm[2], 0)} mm</span>
          </span>
          <span title="Minimum wall thickness allowed">
            <span className="text-forge-text/50">wall≥ </span>
            <span className="text-white">{c.min_wall_thickness_mm} mm</span>
          </span>
          <span title="Maximum overhang angle (for FDM printability)">
            <span className="text-forge-text/50">overhang≤ </span>
            <span className="text-white">{c.max_overhang_deg}°</span>
          </span>
          <span title="Scoring metric and direction">
            <span className="text-forge-text/50">score </span>
            <span style={{ color }}>
              {spec.scoring ? `${metricConfig(spec.scoring.metric).label} (${metricConfig(spec.scoring.metric).unit}) ${spec.scoring.direction === "maximize" ? "↑" : "↓"}` : "—"}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
