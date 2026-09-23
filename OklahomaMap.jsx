import { useEffect, useMemo, useRef, useState } from 'react';
import { COUNTIES, MAP_W, MAP_H } from '../data/counties.js';

const MARK_FILL = { target: '#fde047', wrong: '#ef4444', right: '#22c55e' };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const FULL = { x: 0, y: 0, w: MAP_W, h: MAP_H };

// Zoom target: a box around the given counties (aspect follows the counties, so there's no dead space).
function viewFor(names) {
  if (!names || !names.length) return FULL;
  const cs = COUNTIES.filter((c) => names.includes(c.name));
  if (!cs.length) return FULL;
  const xs = cs.map((c) => c.cx);
  const ys = cs.map((c) => c.cy);
  const pad = 90;
  let w = Math.max(Math.max(...xs) - Math.min(...xs) + pad * 2, 300);
  let h = Math.max(Math.max(...ys) - Math.min(...ys) + pad * 2, 200);
  if (w >= MAP_W * 0.92 || h >= MAP_H * 0.92) return FULL;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  return { x: clamp(cx - w / 2, 0, MAP_W - w), y: clamp(cy - h / 2, 0, MAP_H - h), w, h };
}

/**
 * styleFor(county) -> { fill, opacity, stroke? }
 * marks: { [countyName]: 'target' | 'wrong' | 'right' }
 * clickable(county) -> bool
 * labelFor(county) -> string | null
 * focus: array of names to zoom to initially
 * interactive: show zoom buttons + drag-to-pan
 */
export default function OklahomaMap({
  styleFor,
  clickable,
  onCountyClick,
  marks = {},
  labelFor,
  focus,
  interactive = true,
  className = '',
}) {
  const focusKey = focus ? focus.join('|') : '';
  const [view, setView] = useState(() => viewFor(focus));
  const drag = useRef(null);
  const moved = useRef(false);
  const svgRef = useRef(null);

  useEffect(() => {
    setView(viewFor(focus));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  function zoom(f) {
    setView((v) => {
      const w = v.w * f;
      const h = v.h * f;
      if (w >= MAP_W || h >= MAP_H) return FULL;
      const nw = Math.max(w, 200);
      const nh = nw * (v.h / v.w);
      const cx = v.x + v.w / 2;
      const cy = v.y + v.h / 2;
      return { w: nw, h: nh, x: clamp(cx - nw / 2, 0, MAP_W - nw), y: clamp(cy - nh / 2, 0, MAP_H - nh) };
    });
  }

  function onPointerDown(e) {
    if (!interactive) return;
    moved.current = false;
    drag.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
  }
  function onPointerMove(e) {
    const d = drag.current;
    if (!d || !interactive || (view.w >= MAP_W && view.h >= MAP_H)) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!moved.current && Math.hypot(dx, dy) < 6) return;
    moved.current = true;
    const rect = svgRef.current.getBoundingClientRect();
    const upp = view.w / rect.width;
    setView((v) => ({
      ...v,
      x: clamp(d.vx - dx * upp, 0, MAP_W - v.w),
      y: clamp(d.vy - dy * upp, 0, MAP_H - v.h),
    }));
  }
  function endDrag() {
    drag.current = null;
  }

  const paths = useMemo(() => COUNTIES, []);

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className={`block w-full h-auto select-none ${interactive ? 'touch-none' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        role="img"
        aria-label="Map of Oklahoma counties"
      >
        {paths.map((c) => {
          const st = (styleFor && styleFor(c)) || {};
          const mark = marks[c.name];
          const can = clickable ? clickable(c) : false;
          return (
            <path
              key={c.name}
              d={c.d}
              data-county={c.name}
              fill={mark ? MARK_FILL[mark] : st.fill || '#334155'}
              fillOpacity={mark ? 1 : st.opacity ?? 1}
              stroke={st.stroke || '#0f172a'}
              strokeWidth={1.2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className={`county ${can ? 'county-click' : ''} ${mark === 'target' ? 'pulse-target' : ''}`}
              style={{ pointerEvents: can ? 'auto' : 'none' }}
              onClick={() => {
                if (moved.current) {
                  moved.current = false;
                  return;
                }
                if (can && onCountyClick) onCountyClick(c);
              }}
            />
          );
        })}
        {labelFor &&
          COUNTIES.map((c) => {
            const t = labelFor(c);
            if (!t) return null;
            return (
              <text
                key={`l-${c.name}`}
                x={c.cx}
                y={c.cy}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  fill: '#fff',
                  stroke: '#0f172a',
                  strokeWidth: 3,
                  paintOrder: 'stroke',
                  pointerEvents: 'none',
                }}
              >
                {t}
              </text>
            );
          })}
      </svg>
      {interactive && (
        <div className="absolute right-2 bottom-2 flex flex-col gap-1">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoom(0.7)}
            className="h-9 w-9 rounded-lg bg-slate-800/90 text-xl font-bold text-white shadow hover:bg-slate-700"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoom(1 / 0.7)}
            className="h-9 w-9 rounded-lg bg-slate-800/90 text-xl font-bold text-white shadow hover:bg-slate-700"
          >
            −
          </button>
        </div>
      )}
    </div>
  );
}
