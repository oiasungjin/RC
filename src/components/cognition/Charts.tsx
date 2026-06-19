'use client';
// 인지 대시보드 시각화 — 외부 차트 의존성 없이 순수 SVG.
// Apple 토큰(ink/accent/hairline + emerald/amber/rose 시스템 컬러)을 그대로 사용.

import { useEffect, useRef, useState } from 'react';
import type { Band } from '@/lib/cognition';

// 밴드 색 — 중립 톤(의료 경고색 빨강/초록 대신 브랜드 블루 + 무채색 슬레이트).
export const BAND_COLOR: Record<Band, string> = {
  good: '#0066cc',  // Action Blue — 긍정 상태
  watch: '#8e8e93', // 시스템 그레이 — 보통
  risk: '#48484a',  // 진한 잉크그레이 — '집중 필요'(경고색 아님)
  na: '#aeaeb2',
};

// 강도(0~1) → 중립 톤(옅은 슬레이트 → Action Blue). null이면 회색.
// (이전: 초록→빨강 신호등 = 의료 경고 톤. valence 제거를 위해 단색 블루 그라데이션으로 교체.)
export function failColor(intensity: number | null): string {
  if (intensity === null) return '#f0f0f0';
  const r = Math.max(0, Math.min(1, intensity));
  return lerp('#cdd8e6', '#0066cc', r);
}
function lerp(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
function hex(h: string): [number, number, number] {
  const n = h.replace('#', '');
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

// ---------- CCI 반원 게이지 ----------
export function Gauge({ score, color, label }: { score: number | null; color: string; label: string }) {
  const W = 220;
  const H = 124;
  const cx = W / 2;
  const cy = 112;
  const R = 92;
  const start = Math.PI; // 180°
  const frac = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const end = Math.PI - frac * Math.PI; // 좌→우
  const p = (ang: number) => [cx + R * Math.cos(ang), cy - R * Math.sin(ang)];
  const [sx, sy] = p(start);
  const [tx, ty] = p(0); // 트랙 끝
  const [ex, ey] = p(end);
  // 게이지 호는 항상 180° 이하(좌→우 윗호)라 large-arc-flag는 0 고정.
  // (이전엔 frac>0.5에서 1로 잘못 둬, 점수>50일 때 값 호가 아래로 크게 돌아 트랙과 어긋났음)
  const large = 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[260px]" role="img" aria-label={label}>
      {/* 트랙 */}
      <path d={`M ${sx} ${sy} A ${R} ${R} 0 0 1 ${tx} ${ty}`} fill="none" stroke="#f0f0f0" strokeWidth="14" strokeLinecap="round" />
      {/* 값 */}
      {score !== null && (
        <path d={`M ${sx} ${sy} A ${R} ${R} 0 ${large} 1 ${ex} ${ey}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
      )}
      <text x={cx} y={cy - 26} textAnchor="middle" className="fill-ink" style={{ fontSize: 34, fontWeight: 700 }}>
        {score === null ? '—' : Math.round(score)}
      </text>
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-inkMuted" style={{ fontSize: 12 }}>
        {label}
      </text>
    </svg>
  );
}

// ---------- 5축 레이더 ----------
export interface RadarAxis {
  label: string;
  value: number | null; // 0~100
}
export function Radar({ axes }: { axes: RadarAxis[] }) {
  const size = 240;
  const c = size / 2;
  const R = 92;
  const n = axes.length;
  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i: number, r: number) => [c + r * Math.cos(angleFor(i)), c + r * Math.sin(angleFor(i))];
  const rings = [0.25, 0.5, 0.75, 1];

  const valuePts = axes.map((a, i) => point(i, ((a.value ?? 0) / 100) * R));
  const poly = valuePts.map((p) => p.join(',')).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[300px]" role="img" aria-label="5-axis radar">
      {rings.map((rf, ri) => (
        <polygon
          key={ri}
          points={axes.map((_, i) => point(i, R * rf).join(',')).join(' ')}
          fill="none"
          stroke="#e9e9ec"
          strokeWidth="1"
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, R);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#e9e9ec" strokeWidth="1" />;
      })}
      <polygon points={poly} fill="rgba(0,102,204,0.16)" stroke="#0066cc" strokeWidth="2" strokeLinejoin="round" />
      {valuePts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={axes[i].value === null ? 2.5 : 3.5} fill={axes[i].value === null ? '#aeaeb2' : '#0066cc'} />
      ))}
      {axes.map((a, i) => {
        const [x, y] = point(i, R + 16);
        const anchor = Math.abs(x - c) < 8 ? 'middle' : x > c ? 'start' : 'end';
        return (
          <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" className="fill-inkMuted" style={{ fontSize: 11 }}>
            {a.label}
            {a.value === null ? ' ·?' : ''}
          </text>
        );
      })}
    </svg>
  );
}

// ---------- 추세 선그래프(주간 정확도) ----------
export interface TrendDatum {
  label: string;
  value: number; // 0~100
  tip?: string[]; // 툴팁 줄(예: ['6/9 ~ 6/15', '78점 · 20개'])
}
export function TrendLine({
  data,
  onSelect,
  selectedIndex,
  yMax = 100,
  gridLines = [
    { value: 0, label: '0' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
  ],
}: {
  data: TrendDatum[];
  onSelect?: (i: number) => void;
  selectedIndex?: number | null;
  yMax?: number;
  gridLines?: { value: number; label: string }[];
}) {
  // GA식: 점 개수에 따라 폭이 늘고 가로 스크롤. 기본은 최신(오른쪽)으로 스크롤.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const n = data.length;
  const H = 150;
  const padX = 28;
  const padY = 16;
  const PX_PER_POINT = 46; // 점 간 최소 간격
  const innerW = Math.max(424, (n - 1) * PX_PER_POINT);
  const innerH = H - padY * 2 - 12; // 하단 라벨 공간
  const W = innerW + padX * 2;
  const x = (i: number) => (n <= 1 ? padX + innerW / 2 : padX + (i / (n - 1)) * innerW);
  const y = (v: number) => padY + (1 - v / (yMax || 100)) * innerH;

  // 라벨이 빽빽하면 일부만 표시(첫·끝·선택·간격마다).
  const labelEvery = Math.max(1, Math.ceil(n / 14));
  const showLabel = (i: number) =>
    n <= 14 || i === 0 || i === n - 1 || selectedIndex === i || i % labelEvery === 0;

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.value)}`).join(' ');

  // 데이터/단위가 바뀌면 최신(오른쪽)으로 스크롤.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [n, innerW]);

  // 툴팁 대상 = 마우스 올린 점, 없으면 선택된 점.
  const activeIdx = hover !== null ? hover : selectedIndex != null ? selectedIndex : null;

  return (
    <div ref={scrollRef} className="overflow-x-auto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="composite score trend" style={{ display: 'block' }}>
        {gridLines.map((g) => (
          <g key={g.value}>
            <line x1={padX} y1={y(g.value)} x2={W - padX} y2={y(g.value)} stroke="#f0f0f0" strokeWidth="1" />
            <text x={4} y={y(g.value) + 3} className="fill-slate-400" style={{ fontSize: 9 }}>{g.label}</text>
          </g>
        ))}
        {n > 1 && <path d={line} fill="none" stroke="#0066cc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {data.map((d, i) => {
          const sel = selectedIndex === i;
          return (
            <g
              key={i}
              style={onSelect ? { cursor: 'pointer' } : undefined}
              onClick={onSelect ? () => onSelect(i) : undefined}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            >
              <rect x={x(i) - PX_PER_POINT / 2} y={0} width={PX_PER_POINT} height={H} fill="transparent" />
              {sel && <line x1={x(i)} y1={padY} x2={x(i)} y2={padY + innerH} stroke="#0066cc" strokeWidth="1" strokeDasharray="2 2" opacity={0.4} />}
              {sel && <circle cx={x(i)} cy={y(d.value)} r="7" fill="none" stroke="#0066cc" strokeWidth="1.5" />}
              <circle cx={x(i)} cy={y(d.value)} r={sel || activeIdx === i ? '4.5' : '3'} fill="#0066cc" />
              {showLabel(i) && (
                <text x={x(i)} y={H - 4} textAnchor="middle" className={sel ? 'fill-accent' : 'fill-slate-400'} style={{ fontSize: 9, fontWeight: sel ? 600 : 400 }}>{d.label}</text>
              )}
            </g>
          );
        })}
        {/* 툴팁(기간 범위 + 점수·횟수) */}
        {activeIdx !== null && data[activeIdx]?.tip && data[activeIdx].tip!.length > 0 && (() => {
          const i = activeIdx;
          const lines = data[i].tip!;
          const cw = 7;
          const pad = 8;
          const lineH = 14;
          const boxW = Math.max(40, ...lines.map((l) => l.length * cw)) + pad * 2;
          const boxH = lines.length * lineH + pad * 2 - 2;
          let bx = x(i) - boxW / 2;
          bx = Math.max(padX, Math.min(W - padX - boxW, bx));
          let by = y(data[i].value) - boxH - 12;
          if (by < 2) by = y(data[i].value) + 12;
          return (
            <g pointerEvents="none">
              <rect x={bx} y={by} width={boxW} height={boxH} rx="6" fill="#1d1d1f" opacity="0.92" />
              {lines.map((l, li) => (
                <text
                  key={li}
                  x={bx + boxW / 2}
                  y={by + pad + 4 + li * lineH}
                  textAnchor="middle"
                  fill="#fff"
                  style={{ fontSize: li === 0 ? 11 : 10, fontWeight: li === 0 ? 700 : 400, opacity: li === 0 ? 1 : 0.8 }}
                >
                  {l}
                </text>
              ))}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

// ---------- 가로 막대(라벨별) ----------
export interface BarDatum {
  label: string;
  value: number | null; // 0~100 (null=데이터 없음)
  caption?: string;
  color?: string;
}
export function HBars({ data, naLabel }: { data: BarDatum[]; naLabel: string }) {
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-right text-xs text-slate-500">{d.label}</span>
          <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-parchment">
            {d.value !== null && (
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(3, d.value)}%`, backgroundColor: d.color ?? '#0066cc' }}
              />
            )}
          </div>
          <span className="w-20 shrink-0 text-xs tabular-nums text-slate-500">
            {d.value === null ? naLabel : `${Math.round(d.value)}%`}
            {d.caption ? ` · ${d.caption}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------- 기록 분포 히트맵 ----------
// 단색(Action Blue) 진하기 = 기록 개수. (중립화: 칸 위치별 위험 색조 제거 — 분포만 표시.)
export interface HeatGridCell {
  count: number;
  risk: number; // 0~1, 칸 위치 기반 내재 위험
}
export function Heatmap({
  rows,
  cols,
  cells,
}: {
  rows: string[];
  cols: string[];
  cells: HeatGridCell[][]; // [rowIdx][colIdx]
}) {
  const maxCount = Math.max(1, ...cells.flat().map((c) => c.count));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: 4 }}>
        <thead>
          <tr>
            <th className="w-14" />
            {cols.map((c) => (
              <th key={c} className="pb-1 text-center text-[11px] font-medium text-slate-500">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r}>
              <td className="pr-1 text-right text-[11px] font-medium text-slate-500">{r}</td>
              {cols.map((_, ci) => {
                const cell = cells[ri][ci];
                // 진하기(불투명도) = 기록 개수 비율. 위험 색조 = 칸 위치(risk).
                const op = cell.count === 0 ? 0 : 0.22 + 0.78 * (cell.count / maxCount);
                const dark = op >= 0.5;
                return (
                  <td key={ci} className="p-0">
                    <div className="relative flex h-12 flex-col items-center justify-center overflow-hidden rounded-md bg-[#f7f7f8]">
                      {cell.count > 0 && (
                        <div
                          className="absolute inset-0"
                          style={{ backgroundColor: '#0066cc', opacity: op }}
                        />
                      )}
                      <span
                        className="relative text-[15px] font-bold tabular-nums"
                        style={{ color: cell.count === 0 ? '#cbd0d6' : dark ? '#fff' : '#1d1d1f' }}
                      >
                        {cell.count === 0 ? '·' : cell.count}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
