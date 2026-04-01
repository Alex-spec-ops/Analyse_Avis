"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  RadialBarChart, RadialBar,
} from "recharts";
import type { SourceResult } from "../api/scrape/route";
import type { ActionsProjection, BusinessAction } from "../api/actions/route";

/* ── Palette ───────────────────────────────────────────────── */
const C = {
  positive: "#10b981",
  negative: "#f43f5e",
  neutral:  "#94a3b8",
  violet:   "#8b5cf6",
  indigo:   "#6366f1",
  amber:    "#f59e0b",
  orange:   "#f97316",
};

/* ── 1. Donut — répartition des sentiments ─────────────────── */

interface DonutProps {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  averageScore: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DonutTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 shadow-lg rounded-xl px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700">{payload[0].name}</p>
      <p className="text-slate-500">{payload[0].value} avis · {payload[0].payload.pct}%</p>
    </div>
  );
};

export function SentimentDonut({ positive, negative, neutral, total, averageScore }: DonutProps) {
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
  const data = [
    { name: "Positifs",  value: positive, pct: pct(positive), color: C.positive },
    { name: "Neutres",   value: neutral,  pct: pct(neutral),  color: C.neutral  },
    { name: "Négatifs",  value: negative, pct: pct(negative), color: C.negative },
  ].filter(d => d.value > 0);

  const score = Math.max(0, Math.min(10, 5 + averageScore * 0.5));
  const scoreColor = score >= 6.5 ? C.positive : score >= 4.5 ? C.amber : C.negative;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Centre */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold tabular-nums" style={{ color: scoreColor }}>
            {score.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400 font-medium">/ 10</span>
        </div>
      </div>
      {/* Légende */}
      <div className="flex gap-4 mt-1">
        {data.map((d) => (
          <span key={d.name} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
            {d.name} <span className="font-semibold text-slate-700">{d.pct}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── 2. Barres par source ──────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SourceTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 shadow-lg rounded-xl px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-slate-700">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name} : {p.value}</p>
      ))}
    </div>
  );
};

export function SourceBarChart({ sources }: { sources: SourceResult[] }) {
  const data = sources
    .filter((s) => !s.error && s.counts.total > 0)
    .map((s) => {
      const host = (() => { try { return new URL(s.url).hostname.replace(/^www\./, ""); } catch { return s.url; } })();
      return {
        name: host.length > 18 ? host.slice(0, 16) + "…" : host,
        Positifs: s.counts.positive,
        Neutres: s.counts.neutral,
        Négatifs: s.counts.negative,
      };
    });

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={14} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<SourceTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar dataKey="Positifs"  fill={C.positive} radius={[4, 4, 0, 0]} />
        <Bar dataKey="Neutres"   fill={C.neutral}  radius={[4, 4, 0, 0]} />
        <Bar dataKey="Négatifs"  fill={C.negative} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── 3. Jauge de santé (RadialBar) ────────────────────────── */

export function HealthGauge({ positive, total }: { positive: number; total: number }) {
  const score = total > 0 ? Math.round((positive / total) * 100) : 0;
  const color = score >= 65 ? C.positive : score >= 40 ? C.amber : C.negative;
  const data = [{ value: score, fill: color }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 140, height: 80 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="100%"
            innerRadius="80%" outerRadius="100%"
            startAngle={180} endAngle={0}
            data={data}
          >
            <RadialBar dataKey="value" background={{ fill: "#f1f5f9" }} cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute bottom-0 inset-x-0 flex flex-col items-center">
          <span className="text-2xl font-bold tabular-nums" style={{ color }}>{score}%</span>
          <span className="text-[10px] text-slate-400">satisfaction</span>
        </div>
      </div>
    </div>
  );
}

/* ── 4. Projection avant/après ────────────────────────────── */

export function ROIProjectionChart({ projection }: { projection: ActionsProjection }) {
  const { currentNegativePct, projectedNegativePct, satisfactionGain, roiGlobal } = projection;
  const reduction = currentNegativePct - projectedNegativePct;

  return (
    <div className="space-y-5">
      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 p-3 text-center">
          <p className="text-2xl font-bold text-violet-600 tabular-nums">-{roiGlobal}%</p>
          <p className="text-xs text-slate-500 mt-0.5">avis négatifs</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600 tabular-nums">+{satisfactionGain.toFixed(1)}★</p>
          <p className="text-xs text-slate-500 mt-0.5">note moyenne</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-3 text-center">
          <p className="text-2xl font-bold text-amber-600 tabular-nums">-{reduction}pts</p>
          <p className="text-xs text-slate-500 mt-0.5">% négatifs</p>
        </div>
      </div>

      {/* Avant / Après */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Situation actuelle</span>
            <span className="font-semibold text-rose-600">{currentNegativePct}% d&apos;avis négatifs</span>
          </div>
          <div className="h-4 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-1000"
              style={{ width: `${currentNegativePct}%` }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Après actions recommandées</span>
            <span className="font-semibold text-emerald-600">{projectedNegativePct}% d&apos;avis négatifs</span>
          </div>
          <div className="h-4 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000"
              style={{ width: `${projectedNegativePct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 5. Timeline d'impact ──────────────────────────────────── */

export function ActionTimeline({ actions }: { actions: BusinessAction[] }) {
  const sorted = [...actions].sort((a, b) => a.weeks - b.weeks);
  const maxWeeks = Math.max(...sorted.map((a) => a.weeks), 1);

  const priorityColor: Record<BusinessAction["priority"], string> = {
    haute:   C.negative,
    moyenne: C.amber,
    faible:  C.neutral,
  };

  return (
    <div className="space-y-3">
      {sorted.map((action, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-slate-700 truncate max-w-[60%]">{action.problem}</span>
            <span className="text-slate-400 tabular-nums shrink-0">{action.weeks} sem. · -{action.roi}% négatifs</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${(action.weeks / maxWeeks) * 100}%`,
                background: priorityColor[action.priority],
                opacity: 0.8,
              }}
            />
          </div>
        </div>
      ))}
      <div className="flex justify-between text-[10px] text-slate-300 pt-1">
        <span>Maintenant</span>
        <span>{maxWeeks} semaines</span>
      </div>
    </div>
  );
}
