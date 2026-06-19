'use client';
// 인지기능 대시보드 (기획서 5장 화면 구성)
//  종합점수 게이지 → 5축 레이더 → 개인 내 추세선 → 라벨별 비교 막대 → 망각 히트맵
//  → 오늘의 인사이트 → 또래 비교(참고용) → 보완 데이터 → 의료 진단 아님 상시 표기.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import {
  analyze,
  collectLocalDataset,
  enrichWithServer,
  computePeriodTrend,
  bandFromScore,
  type CognitionDataset,
  type AxisResult,
  type Insight,
  type Granularity,
} from '@/lib/cognition';
import { fetchWordLabels } from '@/lib/wordLabels';
import type { DictHit } from '@/lib/nounLabels';
import {
  Gauge,
  Radar,
  TrendLine,
  HBars,
  Heatmap,
  BAND_COLOR,
  failColor,
  type HeatGridCell,
} from '@/components/cognition/Charts';

const AXIS_ORDER = ['forgetQuality', 'retrieval', 'semantic', 'consolidation', 'context'] as const;
const FREQ_TIERS = ['high', 'mid', 'low', 'none'] as const;
// 히트맵 가로축 = 감정 강도(강→중립). cognition.heatmap()의 버킷 순서와 일치.
const INTENSITY_BUCKETS = [
  { v: 3, key: 'strong' },
  { v: 2, key: 'mid' },
  { v: 1, key: 'weak' },
  { v: 0, key: 'none' },
] as const;
const TONE_STYLE: Record<Insight['tone'], string> = {
  good: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  watch: 'bg-amber-50 text-amber-800 ring-amber-100',
  risk: 'bg-rose-50 text-rose-700 ring-rose-100',
  info: 'bg-accentSoft text-accent ring-blue-100',
};

export default function CognitionPage() {
  const { t } = useI18n();
  // 동적 i18n 키(축·출처·코드)를 위한 느슨한 래퍼 — 정적 키 타입검사는 유지.
  const tt = (key: string, params?: Record<string, string | number>) =>
    t(key as Parameters<typeof t>[0], params);

  const [ds, setDs] = useState<CognitionDataset | null>(null);
  const [granularity, setGranularity] = useState<Granularity>('week');
  const [selTrend, setSelTrend] = useState<number | null>(null);
  const [metric, setMetric] = useState<'cci' | 'accuracy' | 'latency'>('cci');
  const [labels, setLabels] = useState<Map<string, DictHit> | null>(null);

  useEffect(() => {
    // 1) 로컬 데이터로 즉시 렌더, 2) 로그인 시 서버 이력으로 보강 후 재계산.
    const local = collectLocalDataset();
    setDs(local);
    let alive = true;
    enrichWithServer(local).then((enriched) => {
      if (alive && enriched.fromServer) setDs(enriched);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 단어 라벨(빈도·범주)은 서버 API에서 — 사전이 클라 번들에 안 실린다.
  useEffect(() => {
    if (!ds) return;
    let alive = true;
    const words = ds.vocab.filter((v) => v.source === 'user_input').map((v) => v.wordText);
    fetchWordLabels(words).then((m) => {
      if (alive) setLabels(m);
    });
    return () => {
      alive = false;
    };
  }, [ds]);

  const report = useMemo(() => (ds && labels ? analyze(ds, labels) : null), [ds, labels]);
  const periodTrend = useMemo(
    () => (ds && report ? computePeriodTrend(ds, report.words, granularity) : null),
    [ds, report, granularity]
  );

  if (report === null) {
    return <p className="text-slate-500">{t('cog.loading')}</p>;
  }

  if (!report.hasAnyData) {
    return (
      <div className="space-y-5">
        <Header t={t} />
        <section className="card space-y-3">
          <h2 className="display-md">{t('cog.empty.title')}</h2>
          <p className="text-sm text-slate-500">{t('cog.empty.desc')}</p>
          <Link className="btn-primary" href="/record">{t('cog.empty.cta')}</Link>
        </section>
        <Disclaimer t={t} />
      </div>
    );
  }

  const { cci, bars, heat, insights } = report; // cci = 전체(누적) 종합점수

  // 추세 점(CCI 산출된 구간만). 기본 선택 = 가장 최근 구간(헤드라인).
  const trendPts = (periodTrend?.points ?? []).filter((p) => p.cci !== null);
  const effSel = trendPts.length
    ? Math.min(selTrend ?? trendPts.length - 1, trendPts.length - 1)
    : -1;
  const selPoint = effSel >= 0 ? trendPts[effSel] : null;
  const selBand = bandFromScore(selPoint?.cci ?? null);
  // 선택 구간 직전 대비 변화(헤드라인 델타).
  const prevDelta =
    selPoint && effSel > 0
      ? Math.round((selPoint.cci as number) - (trendPts[effSel - 1].cci as number))
      : null;

  // 레이더 데이터(선택 구간 5축, 고정 순서).
  const radarAxes = AXIS_ORDER.map((key) => {
    const a = selPoint?.axes.find((x) => x.key === key);
    return { label: tt(`cog.axis.${key}`), value: a?.score ?? null };
  });

  // 주별 라벨은 날짜(월요일) 대신 'N월 N주차'(GA식 비-날짜). 그 외 단위는 기존 라벨.
  // 달 경계 혼동을 줄이려 '그 주의 목요일'이 속한 달/주차를 쓴다(ISO 관례).
  const labelOf = (p: { key: number; label: string }) => {
    if (granularity !== 'week') return p.label;
    const d = new Date(p.key);
    d.setDate(d.getDate() + 3);
    return t('cog.label.week', { m: d.getMonth() + 1, w: Math.ceil(d.getDate() / 7) });
  };

  // 툴팁용 기간 범위(GA식). 단위별로 시작~끝.
  const rangeOf = (key: number) => {
    const s = new Date(key);
    const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    if (granularity === 'day') return md(s);
    if (granularity === 'week') {
      const e = new Date(key);
      e.setDate(e.getDate() + 6);
      return `${md(s)} ~ ${md(e)}`;
    }
    if (granularity === 'month') {
      const e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
      return `${md(s)} ~ ${md(e)}`;
    }
    return `${s.getFullYear()}.1 ~ ${s.getFullYear()}.12`;
  };

  // 추세 지표 전환: 종합점수(cci) / 훈련정확도(accuracy) / 응답시간(latency, 초).
  const isLatency = metric === 'latency';
  const yMax = isLatency
    ? Math.max(1, Math.ceil(Math.max(1, ...trendPts.map((p) => (p.medianMs ?? 0) / 1000))))
    : 100;
  const half = Math.round((yMax / 2) * 10) / 10;
  const gridLines = isLatency
    ? [
        { value: 0, label: '0' },
        { value: half, label: String(half) },
        { value: yMax, label: String(yMax) },
      ]
    : [
        { value: 0, label: '0' },
        { value: 50, label: '50' },
        { value: 100, label: '100' },
      ];
  const lineData = trendPts.map((p) => {
    const value =
      metric === 'accuracy' ? p.accuracy : isLatency ? (p.medianMs ?? 0) / 1000 : (p.cci as number);
    const tip2 =
      metric === 'accuracy'
        ? t('cog.trend.tipAcc', { acc: p.accuracy, n: p.n })
        : isLatency
        ? t('cog.trend.tipLat', { s: p.medianMs != null ? (p.medianMs / 1000).toFixed(1) : '—', n: p.n })
        : t('cog.trend.tipScore', { score: Math.round(p.cci as number), n: p.n });
    return { label: labelOf(p), value, tip: [rangeOf(p.key), tip2] };
  });

  // 히트맵 그리드(빈도 × 감정 강도). report.heat는 tier 외측 × 강도버킷 내측 순서.
  const heatGrid: HeatGridCell[][] = FREQ_TIERS.map((_, ti) =>
    INTENSITY_BUCKETS.map((__, bi) => {
      const cell = heat[ti * INTENSITY_BUCKETS.length + bi];
      return { count: cell.count, risk: cell.risk };
    })
  );

  // 라벨별 비교 막대 — 기록 단어의 빈도 분포(비율). 고빈도 비중이 클수록 일상어를 자주 못 떠올림.
  const barTotal = Math.max(1, bars.reduce((s, b) => s + b.count, 0));
  const TIER_RISK: Record<string, number> = { high: 1, mid: 0.6, low: 0.3, none: 0.3 };
  const barData = bars.map((b) => ({
    label: tt(`cog.freq.${b.tier}`),
    value: (b.count / barTotal) * 100,
    caption: tt('cog.labels.count', { n: b.count }),
    color: failColor(TIER_RISK[b.tier] ?? 0.3),
  }));

  return (
    <div className="space-y-5">
      <Header t={t} />

      {/* 인지근육 점수 = 선택(기본 최근) 구간 + 기간별 추세 + 그 구간 5축 */}
      <section className="card space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="display-md">{t('cog.trend.title')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('cog.trend.sub')}</p>
          </div>
          <div className="flex shrink-0 rounded-full bg-parchment p-0.5 text-xs">
            {(['day', 'week', 'month', 'year'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGranularity(g);
                  setSelTrend(null);
                }}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  granularity === g ? 'bg-white font-medium text-ink shadow-sm' : 'text-slate-500'
                }`}
              >
                {tt(`cog.gran.${g}`)}
              </button>
            ))}
          </div>
        </div>

        {!selPoint ? (
          // 기간별 구간이 부족하면 전체(누적) 점수를 헤드라인으로 폴백.
          <div className="flex flex-col items-center">
            <Gauge
              score={cci.score}
              color={BAND_COLOR[cci.band]}
              label={t(`cog.band.${cci.band}` as Parameters<typeof t>[0])}
            />
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <span className="pill text-white" style={{ backgroundColor: BAND_COLOR[cci.band] }}>
                {t(`cog.band.${cci.band}` as Parameters<typeof t>[0])}
              </span>
              <span className="text-xs text-slate-400">
                {t('cog.cci.totalLabel')} · {t('cog.cci.coverage', { n: cci.coverage })}
              </span>
            </div>
            <p className="mt-1 text-center text-xs text-slate-400">{t('cog.trend.empty')}</p>
          </div>
        ) : (
          <>
            {/* 헤드라인 게이지 = 선택 구간 종합점수 */}
            <div className="flex flex-col items-center">
              <Gauge
                score={selPoint.cci}
                color={BAND_COLOR[selBand]}
                label={t(`cog.band.${selBand}` as Parameters<typeof t>[0])}
              />
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                <span className="pill text-white" style={{ backgroundColor: BAND_COLOR[selBand] }}>
                  {t(`cog.band.${selBand}` as Parameters<typeof t>[0])}
                </span>
                <span className="text-xs text-slate-400">
                  {t('cog.cci.period', { label: labelOf(selPoint) })} · {t('cog.cci.coverage', { n: selPoint.coverage })}
                </span>
              </div>
              {prevDelta !== null && (
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {prevDelta >= 5
                    ? t('cog.trend.vsUp', { delta: prevDelta })
                    : prevDelta <= -5
                    ? t('cog.trend.vsDown', { delta: Math.abs(prevDelta) })
                    : t('cog.trend.vsFlat')}
                </p>
              )}
              {/* 전체(누적) 점수 — 크게 강조 */}
              <div
                className="mt-2.5 inline-flex items-center gap-2 rounded-full px-4 py-2 ring-1"
                style={{ backgroundColor: `${BAND_COLOR[cci.band]}14`, borderColor: 'transparent', boxShadow: `inset 0 0 0 1px ${BAND_COLOR[cci.band]}55` }}
              >
                <span className="text-sm font-semibold text-slate-600">{t('cog.cci.totalLabel')}</span>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BAND_COLOR[cci.band] }} />
                <span className="text-2xl font-bold leading-none tabular-nums text-ink">
                  {cci.score === null ? '—' : Math.round(cci.score)}
                </span>
                <span className="text-xs text-slate-400">/ 100 · {t('cog.cci.coverage', { n: cci.coverage })}</span>
              </div>
              <p className="mt-1.5 text-center text-xs text-slate-400">{t('cog.cci.caption')}</p>
            </div>

            {/* 추세선(탭하면 그 구간으로) + 지표 전환 */}
            {trendPts.length >= 2 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400">{t('cog.metric.label')}</span>
                  {(['cci', 'accuracy', 'latency'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetric(m)}
                      className={`rounded-full px-2.5 py-1 text-xs ring-1 transition-colors ${
                        metric === m
                          ? 'bg-accent text-white ring-accent'
                          : 'bg-white text-slate-500 ring-hairline hover:bg-parchment'
                      }`}
                    >
                      {tt(`cog.metric.${m}`)}
                    </button>
                  ))}
                </div>
                <TrendLine
                  data={lineData}
                  yMax={yMax}
                  gridLines={gridLines}
                  onSelect={(i) => setSelTrend(i)}
                  selectedIndex={effSel}
                />
                <p className="text-center text-xs text-slate-400">{t('cog.trend.tapHint')}</p>
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400">{t('cog.trend.single')}</p>
            )}

            {/* 선택 구간 5축 */}
            <div className="border-t border-divider pt-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="section-title">
                  {labelOf(selPoint)} {t('cog.trend.detailTitle')}
                </h3>
                {selPoint.medianMs !== null && (
                  <span className="text-xs text-slate-400">
                    {t('cog.trend.medianMs', { s: (selPoint.medianMs / 1000).toFixed(1) })}
                  </span>
                )}
              </div>
              <div className="mt-2 flex justify-center">
                <Radar axes={radarAxes} />
              </div>
              <ul className="divide-y divide-slate-100">
                {AXIS_ORDER.map((key) => {
                  const a = selPoint.axes.find((x) => x.key === key);
                  if (!a) return null;
                  return <AxisRow key={key} axis={a} tt={tt} t={t} />;
                })}
              </ul>
            </div>
          </>
        )}
      </section>

      {/* 라벨별 비교 */}
      <section className="card space-y-3">
        <div>
          <h2 className="display-md">{t('cog.labels.title')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('cog.labels.sub')}</p>
        </div>
        <HBars data={barData} naLabel={t('cog.needData')} />
        <p className="text-xs text-slate-400">
          {t('cog.dictCoverage', { covered: report.dictCovered, total: report.words.length })}
        </p>
      </section>

      {/* 망각 위험 히트맵 */}
      <section className="card space-y-3">
        <div>
          <h2 className="display-md">{t('cog.heat.title')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('cog.heat.sub')}</p>
        </div>
        <Heatmap
          rows={FREQ_TIERS.map((f) => tt(`cog.freq.${f}`))}
          cols={INTENSITY_BUCKETS.map((b) => tt(`cog.intensity.${b.key}`))}
          cells={heatGrid}
        />
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{t('cog.heat.legend')}</span>
          <span className="h-3 w-24 rounded-full" style={{ background: 'linear-gradient(90deg,#34c759,#F59E0B,#ff3b30)' }} />
        </div>
        {report.exposureRisk !== null && (
          <p className="text-xs font-medium text-slate-500">
            {t('cog.heat.exposure', { n: Math.round(report.exposureRisk) })}
          </p>
        )}
      </section>

      {/* 오늘의 인사이트 */}
      <section className="card space-y-3">
        <h2 className="display-md">{t('cog.insight.title')}</h2>
        <ul className="space-y-2">
          {insights.map((ins, i) => (
            <li key={i} className={`rounded-lg px-3.5 py-2.5 text-sm ring-1 ${TONE_STYLE[ins.tone]}`}>
              {tt(`cog.insight.${ins.code}`, ins.params)}
            </li>
          ))}
        </ul>
      </section>

      {/* 또래 비교 (참고용) */}
      <section className="card space-y-2">
        <h2 className="display-md">{t('cog.peer.title')}</h2>
        <p className="text-sm text-slate-500">{t('cog.peer.body', { n: report.userCount })}</p>
      </section>

      {/* 보완할 데이터 (기획서 6장) */}
      <section className="card space-y-3">
        <div>
          <h2 className="display-md">{t('cog.gaps.title')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('cog.gaps.sub')}</p>
        </div>
        <ul className="space-y-1.5 text-sm text-slate-600">
          {(['latency', 'age', 'distractor', 'interval'] as const).map((g) => (
            <li key={g} className="flex gap-2">
              <span className="mt-0.5 text-slate-300">•</span>
              <span>{tt(`cog.gaps.${g}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <Disclaimer t={t} />
    </div>
  );
}

function Header({ t }: { t: ReturnType<typeof useI18n>['t'] }) {
  return (
    <section className="card">
      <span className="eyebrow">{t('cog.eyebrow')}</span>
      <h1 className="mt-1 display-xl">{t('cog.title')}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">{t('cog.desc')}</p>
    </section>
  );
}

function AxisRow({
  axis,
  tt,
  t,
}: {
  axis: AxisResult;
  tt: (k: string, p?: Record<string, string | number>) => string;
  t: ReturnType<typeof useI18n>['t'];
}) {
  const hasScore = axis.score !== null;
  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{tt(`cog.axis.${axis.key}`)}</p>
          <p className="text-xs text-slate-400">{tt(`cog.axis.${axis.key}.desc`)}</p>
        </div>
        <div className="shrink-0 text-right">
          {hasScore ? (
            <span className="text-lg font-bold tabular-nums text-ink">{Math.round(axis.score as number)}</span>
          ) : (
            <span className="pill bg-slate-100 text-slate-500">{t('cog.needData')}</span>
          )}
        </div>
      </div>
      {/* 막대 */}
      {hasScore && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-parchment">
          <div className="h-full rounded-full bg-accent" style={{ width: `${axis.score}%` }} />
        </div>
      )}
      {/* 출처 · 표본 · 결손 */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
        {axis.sources.length > 0 && (
          <span>
            {t('cog.source.label')}: {axis.sources.map((s) => tt(`cog.source.${s}`)).join(', ')}
          </span>
        )}
        <span>· {t('cog.sampleN', { n: axis.sampleN })}</span>
        {axis.missing.map((m) => (
          <span key={m} className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
            {tt(`cog.missing.${m}`)}
          </span>
        ))}
      </div>
    </li>
  );
}

function Disclaimer({ t }: { t: ReturnType<typeof useI18n>['t'] }) {
  return (
    <p className="px-1 text-center text-xs leading-relaxed text-slate-400">{t('cog.disclaimer')}</p>
  );
}
