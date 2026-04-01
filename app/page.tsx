"use client";

import { useState, useEffect, useCallback } from "react";
import type { ScrapeResult, Review, SourceResult } from "./api/scrape/route";
import type { SentimentSummaries } from "./api/summarize/route";
import type { ActionsResult, BusinessAction } from "./api/actions/route";
import { ROIProjectionChart, ActionTimeline } from "./components/Charts";

type Step = "search" | "results" | "actions";
type AsyncStatus = "idle" | "loading" | "success" | "error";
type SentimentKey = Review["sentiment"];

interface HistoryItem {
  query: string;
  timestamp: number;
}

/* ─────────────────────────────────────────────────────────────
   Config
───────────────────────────────────────────────────────────── */

const PLATFORMS = [
  { name: "Trustpilot", color: "#00b67a" },
  { name: "Google", color: "#4285f4" },
  { name: "TripAdvisor", color: "#34e0a1" },
  { name: "Pages Jaunes", color: "#ffcc00" },
  { name: "Yelp", color: "#d32323" },
  { name: "Indeed", color: "#003a9b" },
  { name: "Glassdoor", color: "#0caa41" },
  { name: "Custplace", color: "#6c63ff" },
];

const PRIORITY_CFG = {
  haute:   { label: "Urgent",     stepBg: "bg-rose-500",  stepText: "text-white",      border: "border-rose-100",   tag: "bg-rose-100 text-rose-600"   },
  moyenne: { label: "Important",  stepBg: "bg-amber-400", stepText: "text-white",      border: "border-amber-100",  tag: "bg-amber-100 text-amber-600"  },
  faible:  { label: "Utile",      stepBg: "bg-slate-300", stepText: "text-slate-700",  border: "border-slate-100",  tag: "bg-slate-100 text-slate-500"  },
} as const;

/* ─────────────────────────────────────────────────────────────
   Small UI atoms
───────────────────────────────────────────────────────────── */

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <span className={`${className} inline-block rounded-full border-2 border-current border-t-transparent animate-spin opacity-60`} />
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

function BackButton({ onClick, label = "Retour" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}

function SentimentBadge({ s }: { s: SentimentKey }) {
  const cfg = { positive: "bg-emerald-100 text-emerald-700", negative: "bg-rose-100 text-rose-700", neutral: "bg-slate-100 text-slate-600" }[s];
  const dot = { positive: "bg-emerald-500", negative: "bg-rose-500", neutral: "bg-slate-400" }[s];
  const label = { positive: "Positif", negative: "Négatif", neutral: "Neutre" }[s];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Stat card
───────────────────────────────────────────────────────────── */

function StatCard({ label, count, pct, gradient }: { label: string; count: number; pct: number; gradient: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm p-5 flex flex-col gap-2">
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${gradient}`} />
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-black text-slate-900 tabular-nums leading-none">{count}</span>
        <span className="text-lg font-bold text-slate-400 tabular-nums mb-0.5">{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Source chip
───────────────────────────────────────────────────────────── */

function SourceChip({ source }: { source: SourceResult }) {
  const host = (() => { try { return new URL(source.url).hostname.replace(/^www\./, ""); } catch { return source.url; } })();
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
      {host}
      <span className="text-slate-400">{source.counts.total}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Bullet list (summaries)
───────────────────────────────────────────────────────────── */

function BulletList({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul className="space-y-2">
      {items.map((b, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
          {b}
        </li>
      ))}
    </ul>
  );
}

/* ─────────────────────────────────────────────────────────────
   Review card
───────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────
   History Drawer
───────────────────────────────────────────────────────────── */

function HistoryDrawer({ items, onSelect, onClose, onDelete, onClear }: {
  items: HistoryItem[];
  onSelect: (q: string) => void;
  onClose: () => void;
  onDelete: (idx: number) => void;
  onClear: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative w-full max-w-xs bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Historique</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <span className="text-3xl grayscale opacity-30">📂</span>
              <p className="text-xs text-slate-400 italic">Aucune recherche récente.</p>
            </div>
          ) : (
            items.map((item, i) => (
              <div 
                key={i} 
                className="group flex items-center gap-2 p-3 rounded-xl border border-slate-100 bg-white hover:border-violet-200 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => onSelect(item.query)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700 truncate">{item.query}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(item.timestamp).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(i); }}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-slate-100">
            <button 
              onClick={onClear}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50 transition-all"
            >
              Vider l'historique
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const border = { positive: "border-l-emerald-400", negative: "border-l-rose-400", neutral: "border-l-slate-300" }[review.sentiment];
  return (
    <div className={`rounded-xl border border-slate-100 bg-white shadow-sm border-l-4 ${border} px-4 py-3 space-y-1.5`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SentimentBadge s={review.sentiment} />
          <span className="text-xs text-slate-400">{review.source}</span>
        </div>
        {review.rating && (
          <span className="text-xs text-amber-500 font-semibold">★ {review.rating}</span>
        )}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{review.text}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE — SEARCH
───────────────────────────────────────────────────────────── */

function SearchPage({ onSearch, loading, error, onShowHistory, historyCount }: {
  onSearch: (company: string) => void;
  loading: boolean;
  error: string;
  onShowHistory: () => void;
  historyCount: number;
}) {
  const [input, setInput] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) onSearch(input.trim());
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Top bar */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black">A</div>
            <span className="font-bold text-slate-800 tracking-tight">AvisScope</span>
          </div>
          
          <button 
            onClick={onShowHistory}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <div className="relative">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              {historyCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-violet-500 border-2 border-white rounded-full" />
              )}
            </div>
            <span className="text-xs font-bold">Historique</span>
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl space-y-10">

          {/* Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-violet-600 text-xs font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              Analyse de réputation en temps réel
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Que dit-on de<br />votre entreprise ?
            </h1>
            <p className="text-slate-500 text-base">
              Entrez un nom d&apos;entreprise — nous collectons et analysons tous les avis disponibles sur le web.
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ex : Decathlon, Air France, SNCF…"
                autoFocus
                className="w-full h-14 pl-11 pr-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-900 text-base placeholder:text-slate-300 focus:outline-none focus:border-violet-400 focus:bg-white transition shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-bold text-base shadow-md hover:from-violet-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? <><Spinner className="w-4 h-4" /> Recherche en cours…</> : "Analyser les avis"}
            </button>
          </form>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
              <svg className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z" />
              </svg>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {/* Platforms */}
          <div className="space-y-3">
            <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest">Sources analysées</p>
            <div className="flex flex-wrap justify-center gap-2">
              {PLATFORMS.map(p => (
                <span key={p.name} className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-600 shadow-sm">
                  {p.name}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE — RESULTS
───────────────────────────────────────────────────────────── */

function ResultsPage({ company, result, summaries, summarizeStatus, onGoToActions, onBack, filter, setFilter }: {
  company: string;
  result: ScrapeResult;
  summaries: SentimentSummaries | null;
  summarizeStatus: AsyncStatus;
  onGoToActions: () => void;
  onBack: () => void;
  filter: "all" | SentimentKey;
  setFilter: (f: "all" | SentimentKey) => void;
}) {
  const { aggregated, allReviews, sources } = result;
  const pct = (n: number) => aggregated.total > 0 ? Math.round((n / aggregated.total) * 100) : 0;

  const filteredReviews = allReviews.filter(r => filter === "all" || r.sentiment === filter);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">A</div>
          <span className="font-bold text-slate-800 tracking-tight hidden sm:block">AvisScope</span>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400 ml-2">
            <button onClick={onBack} className="hover:text-slate-600 transition-colors">Recherche</button>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="font-semibold text-slate-700 truncate max-w-[120px]">{company}</span>
          </div>

          <button
            onClick={onGoToActions}
            className="ml-auto flex items-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-bold shadow-sm hover:from-violet-600 hover:to-indigo-600 transition-all shrink-0"
          >
            Plan d&apos;action
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8 w-full">

        {/* Company + meta */}
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{company}</h1>
            <p className="text-sm text-slate-400 mt-0.5">{aggregated.total} avis collectés sur {sources.filter(s => s.counts.total > 0).length} plateforme{sources.filter(s => s.counts.total > 0).length > 1 ? "s" : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sources.filter(s => s.counts.total > 0).map((s, i) => <SourceChip key={i} source={s} />)}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Positifs"  count={aggregated.positive} pct={pct(aggregated.positive)} gradient="from-emerald-400 to-emerald-500" />
          <StatCard label="Négatifs"  count={aggregated.negative} pct={pct(aggregated.negative)} gradient="from-rose-400 to-rose-500" />
          <StatCard label="Neutres"   count={aggregated.neutral}  pct={pct(aggregated.neutral)}  gradient="from-slate-300 to-slate-400" />
        </div>

        {/* Summaries */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Positifs */}
          <div className="rounded-2xl bg-white border border-emerald-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Ce qu&apos;ils apprécient</span>
            </div>
            <div className="p-5">
              {summarizeStatus === "loading" && (
                <div className="space-y-2.5">
                  {[1,2,3].map(n => <Skeleton key={n} className="h-3 w-full" />)}
                </div>
              )}
              {summarizeStatus === "success" && summaries && summaries.positive.length > 0 && (
                <BulletList items={summaries.positive} dot="bg-emerald-500" />
              )}
              {summarizeStatus === "success" && summaries && summaries.positive.length === 0 && (
                <p className="text-xs text-slate-400 italic">Aucun point positif identifié.</p>
              )}
            </div>
          </div>

          {/* Négatifs */}
          <div className="rounded-2xl bg-white border border-rose-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-xs font-bold text-rose-700 uppercase tracking-widest">Ce qu&apos;ils reprochent</span>
            </div>
            <div className="p-5">
              {summarizeStatus === "loading" && (
                <div className="space-y-2.5">
                  {[1,2,3].map(n => <Skeleton key={n} className="h-3 w-full" />)}
                </div>
              )}
              {summarizeStatus === "success" && summaries && summaries.negative.length > 0 && (
                <BulletList items={summaries.negative} dot="bg-rose-500" />
              )}
              {summarizeStatus === "success" && summaries && summaries.negative.length === 0 && (
                <p className="text-xs text-slate-400 italic">Aucun point négatif identifié.</p>
              )}
            </div>
          </div>

        </div>

        {/* CTA */}
        {aggregated.negative > 0 && (
          <button
            onClick={onGoToActions}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold text-base shadow-md hover:from-orange-600 hover:to-rose-600 transition-all flex items-center justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2v7M9 13v2" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" />
            </svg>
            Voir le plan d&apos;action pour réduire les avis négatifs
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-xs text-slate-400 font-medium">Tous les avis collectés</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-100 shadow-sm w-fit">
          {(["all", "positive", "negative", "neutral"] as const).map(f => {
            const label = f === "all" ? `Tous · ${aggregated.total}` :
              f === "positive" ? `Positifs · ${aggregated.positive}` :
              f === "negative" ? `Négatifs · ${aggregated.negative}` : `Neutres · ${aggregated.neutral}`;
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-700"}`}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Reviews */}
        <div className="space-y-2.5 pb-12">
          {filteredReviews.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">
              Aucun avis dans cette catégorie.
            </div>
          ) : filteredReviews.map((r, i) => <ReviewCard key={i} review={r} />)}
        </div>

      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE — ACTIONS
───────────────────────────────────────────────────────────── */

function ActionsPage({ company, result, actionsResult, actionsStatus, actionsError, onRetry, onBack }: {
  company: string;
  result: ScrapeResult;
  actionsResult: ActionsResult | null;
  actionsStatus: AsyncStatus;
  actionsError: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  const negativePct = result.aggregated.total > 0
    ? Math.round((result.aggregated.negative / result.aggregated.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">A</div>
          <span className="font-bold text-slate-800 tracking-tight hidden sm:block">AvisScope</span>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400 ml-2">
            <button onClick={() => { onBack(); onBack(); }} className="hover:text-slate-600 transition-colors">Recherche</button>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <button onClick={onBack} className="hover:text-slate-600 transition-colors truncate max-w-[100px]">{company}</button>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="font-semibold text-slate-700">Plan d&apos;action</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8 w-full">

        {/* Page title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Plan d&apos;action — {company}</h1>
          <p className="text-sm text-slate-400">
            Basé sur l&apos;analyse de {result.aggregated.negative} avis négatifs ({negativePct}% du total)
          </p>
        </div>

        {/* Error */}
        {actionsStatus === "error" && (
          <div className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
            <p className="text-sm text-rose-700">{actionsError}</p>
            <button onClick={onRetry} className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline">Réessayer</button>
          </div>
        )}

        {/* Loading */}
        {actionsStatus === "loading" && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 flex items-center gap-4">
              <Spinner className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Analyse en cours…</p>
                <p className="text-xs text-slate-400 mt-0.5">Identification des problèmes · Génération des actions · Calcul du ROI</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">{[1,2,3].map(n => <Skeleton key={n} className="h-24 rounded-2xl" />)}</div>
            {[1,2,3,4].map(n => <Skeleton key={n} className="h-40 rounded-2xl" />)}
          </div>
        )}

        {/* Success */}
        {actionsStatus === "success" && actionsResult && (
          <div className="space-y-6">

            {/* Ce qui va changer */}
            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-violet-100 bg-white/50">
                <h2 className="text-sm font-bold text-slate-800">Ce qui va changer</h2>
                <p className="text-xs text-slate-400 mt-0.5">Résultats projetés après application de toutes les actions</p>
              </div>
              <div className="p-5">
                <ROIProjectionChart projection={actionsResult.projection} />
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Ce que vous devez faire</h2>
                <p className="text-xs text-slate-400 mt-0.5">Commencez par l&apos;étape 1 — chaque action est classée par urgence</p>
              </div>

              {actionsResult.actions.map((action: BusinessAction, i: number) => {
                const P = PRIORITY_CFG[action.priority];
                return (
                  <div key={i} className={`rounded-2xl border ${P.border} bg-white shadow-sm overflow-hidden`}>
                    <div className="flex">
                      {/* Step number */}
                      <div className={`${P.stepBg} flex items-start justify-center pt-6 px-5 shrink-0 min-w-[56px]`}>
                        <span className={`text-2xl font-black ${P.stepText} tabular-nums leading-none`}>{i + 1}</span>
                      </div>

                      <div className="flex-1 p-5 space-y-4 min-w-0">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Problème identifié</p>
                            <p className="text-sm font-semibold text-slate-700">{action.problem}</p>
                          </div>
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${P.tag}`}>{P.label}</span>
                        </div>

                        {/* Action */}
                        <div className="rounded-xl bg-slate-900 px-4 py-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Ce que vous devez faire</p>
                          <p className="text-sm font-bold text-white leading-snug">{action.action}</p>
                        </div>

                        {/* Why */}
                        {action.why && (
                          <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                            <span className="text-lg shrink-0">💡</span>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">Pourquoi ça va marcher</p>
                              <p className="text-xs text-slate-600 leading-relaxed">{action.why}</p>
                            </div>
                          </div>
                        )}

                        {/* Metrics */}
                        <div className="flex gap-3 flex-wrap">
                          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                            <span className="text-lg">📉</span>
                            <div>
                              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Résultat attendu</p>
                              <p className="text-sm font-black text-emerald-700">−{action.roi}% d&apos;avis négatifs</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
                            <span className="text-lg">⏱</span>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Délai estimé</p>
                              <p className="text-sm font-black text-slate-700">
                                {action.weeks <= 4 ? "~1 mois" : action.weeks <= 8 ? "~2 mois" : action.weeks <= 12 ? "~3 mois" : `~${Math.round(action.weeks / 4)} mois`}
                              </p>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Timeline */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800">Quand voir les résultats</h2>
                <p className="text-xs text-slate-400 mt-0.5">Temps estimé avant que chaque action impacte vos avis</p>
              </div>
              <div className="p-5">
                <ActionTimeline actions={actionsResult.actions} />
              </div>
            </div>

          </div>
        )}

        <div className="pb-12" />
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ROOT — orchestration
───────────────────────────────────────────────────────────── */

export default function Home() {
  const [step, setStep] = useState<Step>("search");
  const [company, setCompany] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [scrapeStatus, setScrapeStatus]   = useState<AsyncStatus>("idle");
  const [result, setResult]               = useState<ScrapeResult | null>(null);
  const [scrapeError, setScrapeError]     = useState("");

  const [summarizeStatus, setSummarizeStatus] = useState<AsyncStatus>("idle");
  const [summaries, setSummaries]             = useState<SentimentSummaries | null>(null);

  const [actionsStatus, setActionsStatus]   = useState<AsyncStatus>("idle");
  const [actionsResult, setActionsResult]   = useState<ActionsResult | null>(null);
  const [actionsError, setActionsError]     = useState("");

  const [filter, setFilter] = useState<"all" | Review["sentiment"]>("all");

  /* ── History Persistence ── */
  useEffect(() => {
    const saved = localStorage.getItem("avis_history");
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  function addToHistory(name: string) {
    setHistory(prev => {
      const filtered = prev.filter(h => h.query.toLowerCase() !== name.toLowerCase());
      const next = [{ query: name, timestamp: Date.now() }, ...filtered].slice(0, 20);
      localStorage.setItem("avis_history", JSON.stringify(next));
      return next;
    });
  }

  function deleteHistoryItem(idx: number) {
    setHistory(prev => {
      const next = prev.filter((_, i) => i !== idx);
      localStorage.setItem("avis_history", JSON.stringify(next));
      return next;
    });
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem("avis_history");
  }

  /* ── Scrape ── */
  async function handleSearch(name: string) {
    setCompany(name);
    setShowHistory(false);
    setScrapeStatus("loading");
    setResult(null);
    setScrapeError("");
    setSummaries(null);
    setSummarizeStatus("idle");
    setActionsResult(null);
    setActionsStatus("idle");
    setFilter("all");

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [name] }),
      });
      const data = await res.json();
      if (!res.ok) { setScrapeError(data.error ?? "Erreur."); setScrapeStatus("error"); }
      else { 
        setResult(data); 
        setScrapeStatus("success"); 
        setStep("results");
        addToHistory(name);
      }
    } catch { setScrapeError("Impossible de contacter le serveur."); setScrapeStatus("error"); }
  }

  /* ── Summarize (auto-triggered) ── */
  const runSummarize = useCallback(async (r: ScrapeResult) => {
    setSummarizeStatus("loading");
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positive: r.allReviews.filter(x => x.sentiment === "positive").map(x => x.text),
          negative: r.allReviews.filter(x => x.sentiment === "negative").map(x => x.text),
        }),
      });
      const data = await res.json();
      if (res.ok) { setSummaries(data); setSummarizeStatus("success"); }
      else setSummarizeStatus("error");
    } catch { setSummarizeStatus("error"); }
  }, []);

  /* ── Actions (auto-triggered when entering actions page) ── */
  const runActions = useCallback(async (r: ScrapeResult, name: string) => {
    setActionsStatus("loading");
    setActionsResult(null);
    setActionsError("");
    const negativePct = r.aggregated.total > 0
      ? Math.round((r.aggregated.negative / r.aggregated.total) * 100) : 0;
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          negative: r.allReviews.filter(x => x.sentiment === "negative").map(x => x.text),
          positive: r.allReviews.filter(x => x.sentiment === "positive").map(x => x.text),
          company: name,
          negativePct,
        }),
      });
      const data = await res.json();
      if (res.ok) { setActionsResult(data); setActionsStatus("success"); }
      else { setActionsError(data.error ?? "Erreur."); setActionsStatus("error"); }
    } catch { setActionsError("Impossible de contacter le serveur."); setActionsStatus("error"); }
  }, []);

  /* Auto-trigger summarize when results arrive */
  useEffect(() => {
    if (result && summarizeStatus === "idle") runSummarize(result);
  }, [result, summarizeStatus, runSummarize]);

  /* Auto-trigger actions when entering actions page */
  useEffect(() => {
    if (step === "actions" && result && actionsStatus === "idle") runActions(result, company);
  }, [step, result, company, actionsStatus, runActions]);

  /* ── Navigation ── */
  function goToActions() { setStep("actions"); }
  function goToResults() { setStep("results"); }
  function goToSearch()  { setStep("search"); }

  /* ── Render ── */
  return (
    <>
      {step === "search" && (
        <SearchPage 
          onSearch={handleSearch} 
          loading={scrapeStatus === "loading"} 
          error={scrapeError} 
          onShowHistory={() => setShowHistory(true)}
          historyCount={history.length}
        />
      )}

      {step === "results" && result && (
        <ResultsPage
          company={company}
          result={result}
          summaries={summaries}
          summarizeStatus={summarizeStatus}
          onGoToActions={goToActions}
          onBack={goToSearch}
          filter={filter}
          setFilter={setFilter}
        />
      )}

      {step === "actions" && result && (
        <ActionsPage
          company={company}
          result={result}
          actionsResult={actionsResult}
          actionsStatus={actionsStatus}
          actionsError={actionsError}
          onRetry={() => runActions(result, company)}
          onBack={goToResults}
        />
      )}

      {showHistory && (
        <HistoryDrawer 
          items={history} 
          onClose={() => setShowHistory(false)} 
          onSelect={handleSearch}
          onDelete={deleteHistoryItem}
          onClear={clearHistory}
        />
      )}
    </>
  );
}
