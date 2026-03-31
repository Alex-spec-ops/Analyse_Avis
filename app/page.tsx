"use client";

import { useState } from "react";
import type { ScrapeResult, Review, SourceResult } from "./api/scrape/route";
import type { SentimentSummaries } from "./api/summarize/route";

type ScrapeStatus = "idle" | "loading" | "success" | "error";
type SummarizeStatus = "idle" | "loading" | "success" | "error";
type SentimentKey = Review["sentiment"];
type FilterKey = "all" | SentimentKey;

const S = {
  positive: {
    label: "Positif",
    plural: "Positifs",
    light: "bg-emerald-50 border-emerald-200 text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    bar: "bg-emerald-400",
    card: "border-l-emerald-400",
    summary: "bg-emerald-50 border-emerald-200",
    summaryTitle: "text-emerald-700",
    summaryText: "text-emerald-900",
    stat: "from-emerald-500 to-emerald-600",
    icon: "✦",
  },
  negative: {
    label: "Négatif",
    plural: "Négatifs",
    light: "bg-rose-50 border-rose-200 text-rose-700",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
    bar: "bg-rose-400",
    card: "border-l-rose-400",
    summary: "bg-rose-50 border-rose-200",
    summaryTitle: "text-rose-700",
    summaryText: "text-rose-900",
    stat: "from-rose-500 to-rose-600",
    icon: "✦",
  },
  neutral: {
    label: "Neutre",
    plural: "Neutres",
    light: "bg-slate-50 border-slate-200 text-slate-600",
    badge: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
    bar: "bg-slate-300",
    card: "border-l-slate-300",
    summary: "bg-slate-50 border-slate-200",
    summaryTitle: "text-slate-600",
    summaryText: "text-slate-800",
    stat: "from-slate-400 to-slate-500",
    icon: "✦",
  },
} as const;

/* ── Small helpers ─────────────────────────────────────────── */

function Badge({ s }: { s: SentimentKey }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${S[s].badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${S[s].dot}`} />
      {S[s].label}
    </span>
  );
}

function Spinner({ size = 4 }: { size?: number }) {
  return (
    <span
      style={{ width: size * 4, height: size * 4 }}
      className="inline-block rounded-full border-2 border-slate-200 border-t-slate-500 animate-spin"
    />
  );
}

/* ── Stat cards ────────────────────────────────────────────── */

function StatCard({ sentiment, count, total }: { sentiment: SentimentKey; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const cfg = S[sentiment];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-3 p-5">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${cfg.stat}`} />
      <span className={`text-xs font-semibold uppercase tracking-widest ${cfg.summaryTitle}`}>
        {cfg.plural}
      </span>
      <div className="flex items-end justify-between">
        <span className="text-4xl font-bold text-slate-900 tabular-nums leading-none">{count}</span>
        <span className={`text-2xl font-bold tabular-nums ${cfg.summaryTitle} opacity-70`}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${cfg.stat} transition-all duration-1000`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Stacked distribution bar ──────────────────────────────── */

function DistributionBar({ positive, negative, neutral, total }: { positive: number; negative: number; neutral: number; total: number }) {
  if (total === 0) return null;
  const pct = (n: number) => (n / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {positive > 0 && (
          <div
            title={`Positifs : ${positive}`}
            className="bg-emerald-400 transition-all duration-1000"
            style={{ width: `${pct(positive)}%` }}
          />
        )}
        {neutral > 0 && (
          <div
            title={`Neutres : ${neutral}`}
            className="bg-slate-300 transition-all duration-1000"
            style={{ width: `${pct(neutral)}%` }}
          />
        )}
        {negative > 0 && (
          <div
            title={`Négatifs : ${negative}`}
            className="bg-rose-400 transition-all duration-1000"
            style={{ width: `${pct(negative)}%` }}
          />
        )}
      </div>
      <div className="flex gap-4 text-xs text-slate-400">
        {(["positive", "negative", "neutral"] as const).map((k) => {
          const counts: Record<string, number> = { positive, negative, neutral };
          return (
            <span key={k} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-sm ${S[k].dot}`} />
              {S[k].plural} · {Math.round(pct(counts[k]))}%
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── Source chip ───────────────────────────────────────────── */

function SourceChip({ source }: { source: SourceResult }) {
  const host = (() => { try { return new URL(source.url).hostname.replace(/^www\./, ""); } catch { return source.url; } })();
  const hasError = !!source.error;
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
      hasError
        ? "bg-rose-50 border-rose-200 text-rose-600"
        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
    }`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${hasError ? "bg-rose-400" : "bg-emerald-400"}`} />
      <span className="truncate max-w-[160px]" title={source.url}>{host}</span>
      <span className={`shrink-0 ${hasError ? "text-rose-400" : "text-slate-400"}`}>
        {hasError ? "Erreur" : `${source.counts.total} avis`}
      </span>
    </div>
  );
}

/* ── Skeleton loader ───────────────────────────────────────── */

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-32 rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────── */

export default function Home() {
  const [urls, setUrls] = useState<string[]>([""]);
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus>("idle");
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [scrapeError, setScrapeError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const [summarizeStatus, setSummarizeStatus] = useState<SummarizeStatus>("idle");
  const [summaries, setSummaries] = useState<SentimentSummaries | null>(null);
  const [summarizeError, setSummarizeError] = useState("");

  function updateUrl(i: number, val: string) {
    setUrls((prev) => prev.map((u, idx) => (idx === i ? val : u)));
  }
  function addUrl() { if (urls.length < 10) setUrls((p) => [...p, ""]); }
  function removeUrl(i: number) { setUrls((p) => p.filter((_, idx) => idx !== i)); }

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    const validUrls = urls.map((u) => u.trim()).filter(Boolean);
    if (!validUrls.length) return;
    setScrapeStatus("loading");
    setResult(null);
    setScrapeError("");
    setFilter("all");
    setSourceFilter("all");
    setSummaries(null);
    setSummarizeStatus("idle");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: validUrls }),
      });
      const data = await res.json();
      if (!res.ok) { setScrapeError(data.error ?? "Erreur."); setScrapeStatus("error"); }
      else { setResult(data); setScrapeStatus("success"); }
    } catch { setScrapeError("Impossible de contacter le serveur."); setScrapeStatus("error"); }
  }

  async function handleSummarize() {
    if (!result) return;
    setSummarizeStatus("loading");
    setSummaries(null);
    setSummarizeError("");
    const reviews = result.allReviews;
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positive: reviews.filter((r) => r.sentiment === "positive").map((r) => r.text),
          negative: reviews.filter((r) => r.sentiment === "negative").map((r) => r.text),
          neutral: reviews.filter((r) => r.sentiment === "neutral").map((r) => r.text),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSummarizeError(data.error ?? "Erreur."); setSummarizeStatus("error"); }
      else { setSummaries(data); setSummarizeStatus("success"); }
    } catch { setSummarizeError("Impossible de contacter le serveur."); setSummarizeStatus("error"); }
  }

  const sourceNames = result ? [...new Set(result.allReviews.map((r) => r.source))] : [];
  const filteredReviews = result?.allReviews.filter((r) =>
    (filter === "all" || r.sentiment === filter) &&
    (sourceFilter === "all" || r.source === sourceFilter)
  ) ?? [];

  const hasValidInput = urls.some((u) => u.trim());

  // Détecte si une entrée ressemble à une URL
  function inputIsUrl(s: string): boolean {
    const t = s.trim();
    if (/^https?:\/\//i.test(t)) return true;
    if (!t.includes(" ") && /\.[a-z]{2,}(\/|$)/i.test(t)) return true;
    return false;
  }

  const hasCompanySearch = urls.some(u => u.trim() && !inputIsUrl(u));

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold select-none">
            A
          </div>
          <span className="font-semibold text-slate-800 tracking-tight">Analyse d&apos;avis</span>
          {scrapeStatus === "success" && result && (
            <span className="ml-auto text-xs text-slate-400 tabular-nums">
              {result.aggregated.total} avis · {result.sources.length} source{result.sources.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Hero + form */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 space-y-5">
        <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Analysez les avis de n&apos;importe quelle entreprise
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Entrez une <strong>URL de page d&apos;avis</strong> ou directement un <strong>nom d&apos;entreprise</strong>
              {" "}— nous cherchons automatiquement sur Trustpilot, Pages Jaunes, Yelp et TripAdvisor.
            </p>
          </div>

          <form onSubmit={handleScrape} className="space-y-3">
            <div className="space-y-2">
              {urls.map((url, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-slate-300 font-mono w-4 text-center select-none shrink-0">{i + 1}</span>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => updateUrl(i, e.target.value)}
                      placeholder="Decathlon, SNCF… ou https://fr.trustpilot.com/review/…"
                      className="w-full h-10 px-3 pr-24 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent focus:bg-white transition"
                    />
                    {url.trim() && (
                      <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        inputIsUrl(url)
                          ? "bg-indigo-50 text-indigo-500 border border-indigo-100"
                          : "bg-violet-50 text-violet-600 border border-violet-100"
                      }`}>
                        {inputIsUrl(url) ? "URL" : "🔍 Recherche"}
                      </span>
                    )}
                  </div>
                  {urls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeUrl(i)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-400 hover:bg-rose-50 transition-colors shrink-0"
                      aria-label="Supprimer"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              {urls.length < 10 && (
                <button
                  type="button"
                  onClick={addUrl}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  Ajouter
                </button>
              )}
              {hasCompanySearch && (
                <span className="text-xs text-violet-500 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="opacity-70">
                    <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M8 8l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Recherche automatique sur Trustpilot, Pages Jaunes, Yelp, TripAdvisor
                </span>
              )}
              <button
                type="submit"
                disabled={scrapeStatus === "loading" || !hasValidInput}
                className="ml-auto flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-sm font-semibold shadow-sm hover:from-violet-600 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {scrapeStatus === "loading" ? (
                  <><Spinner size={3} /> {hasCompanySearch ? "Recherche en cours…" : "Analyse en cours…"}</>
                ) : (
                  <>
                    {hasCompanySearch ? "Rechercher" : "Analyser"}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>

          {scrapeStatus === "error" && (
            <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
              <svg className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z"/>
              </svg>
              <p className="text-sm text-rose-700">{scrapeError}</p>
            </div>
          )}

          {/* Sources — affichées dans la carte après la recherche */}
          {scrapeStatus === "success" && result && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Sources analysées</p>
              <div className="flex flex-wrap gap-2">
                {result.sources.map((s, i) => <SourceChip key={i} source={s} />)}
              </div>
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {scrapeStatus === "loading" && <ResultsSkeleton />}

        {/* Results */}
        {scrapeStatus === "success" && result && (
          <div className="space-y-5">

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3">
              {(["positive", "negative", "neutral"] as const).map((k) => (
                <StatCard key={k} sentiment={k} count={result.aggregated[k]} total={result.aggregated.total} />
              ))}
            </div>

            {/* Distribution */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Distribution</span>
                <span className="text-xs text-slate-400">
                  Score moyen :{" "}
                  <span className={`font-semibold ${result.aggregated.averageScore > 0 ? "text-emerald-600" : result.aggregated.averageScore < 0 ? "text-rose-600" : "text-slate-500"}`}>
                    {result.aggregated.averageScore > 0 ? "+" : ""}{result.aggregated.averageScore}
                  </span>
                </span>
              </div>
              <DistributionBar {...result.aggregated} />
            </div>

            {/* AI Summary */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M6 1l1.2 3.6H11L8.4 6.8l.9 3.2L6 8.4l-3.3 1.6.9-3.2L1 4.6h3.8z"/>
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">Résumé IA</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400 ml-7">Synthèse Llama par groupe de sentiment</p>
                </div>
                <button
                  onClick={handleSummarize}
                  disabled={summarizeStatus === "loading" || result.aggregated.total === 0}
                  className="shrink-0 flex items-center gap-2 h-9 px-4 rounded-xl border border-violet-200 bg-violet-50 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {summarizeStatus === "loading" ? (
                    <><Spinner size={3} /> Génération…</>
                  ) : summarizeStatus === "success" ? (
                    "Régénérer"
                  ) : (
                    "Générer"
                  )}
                </button>
              </div>

              {summarizeStatus === "error" && (
                <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3 border border-rose-200">{summarizeError}</p>
              )}

              {summarizeStatus === "idle" && (
                <p className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-xl">
                  Cliquez sur &quot;Générer&quot; pour obtenir une synthèse par sentiment
                </p>
              )}

              {summarizeStatus === "loading" && (
                <div className="space-y-3">
                  {(["positive", "negative", "neutral"] as const).map((k) => (
                    <div key={k} className={`rounded-xl border p-4 space-y-2 ${S[k].summary}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${S[k].dot}`} />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  ))}
                </div>
              )}

              {summarizeStatus === "success" && summaries && (
                <div className="space-y-3">
                  {(["positive", "negative", "neutral"] as const).map((k) => (
                    <div key={k} className={`rounded-xl border p-4 ${S[k].summary}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${S[k].dot}`} />
                        <span className={`text-xs font-bold uppercase tracking-widest ${S[k].summaryTitle}`}>{S[k].plural}</span>
                        <span className="text-xs text-slate-400 ml-1">· {result.aggregated[k]} avis</span>
                      </div>
                      <p className={`text-sm leading-relaxed ${S[k].summaryText}`}>{summaries[k]}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-100 shadow-sm">
                {(["all", "positive", "negative", "neutral"] as const).map((f) => {
                  const label = f === "all"
                    ? `Tous · ${result.aggregated.total}`
                    : `${S[f].plural} · ${result.aggregated[f]}`;
                  const active = filter === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        active
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {sourceNames.length > 1 && (
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="ml-auto h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                >
                  <option value="all">Toutes les sources</option>
                  {sourceNames.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Review count */}
            <p className="text-xs text-slate-400">
              {filteredReviews.length} avis affiché{filteredReviews.length > 1 ? "s" : ""}
            </p>

            {/* Review cards */}
            <div className="space-y-2.5">
              {filteredReviews.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-2xl">
                  Aucun avis dans cette catégorie.
                </div>
              ) : (
                filteredReviews.map((review, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border border-slate-100 bg-white shadow-sm pl-4 pr-4 py-4 border-l-4 ${S[review.sentiment].card} flex flex-col gap-2`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge s={review.sentiment} />
                        <span className="text-xs text-slate-400">{review.source}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {review.rating && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-amber-400" viewBox="0 0 12 12" fill="currentColor">
                              <path d="M6 1l1.2 3.6H11L8.4 6.8l.9 3.2L6 8.4l-3.3 1.6.9-3.2L1 4.6h3.8z"/>
                            </svg>
                            {review.rating}
                          </span>
                        )}
                        <span className={`font-mono font-semibold ${review.score > 0 ? "text-emerald-500" : review.score < 0 ? "text-rose-500" : "text-slate-400"}`}>
                          {review.score > 0 ? "+" : ""}{review.score}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{review.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Idle empty state */}
        {scrapeStatus === "idle" && (
          <div className="text-center py-16 space-y-3">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-2xl">
              🔍
            </div>
            <p className="text-sm text-slate-400">Entrez une URL ci-dessus pour commencer l&apos;analyse</p>
          </div>
        )}
      </main>
    </div>
  );
}
