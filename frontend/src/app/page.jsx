"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Figtree } from "next/font/google";

const font = Figtree({ subsets: ["latin"], display: "swap" });
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001";
const PAGE_SIZE = 10;
const THEME_KEY = "np-theme";

const SORTS = [
  { value: "latest", label: "Latest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "articles", label: "Most articles" },
  { value: "intensity", label: "Highest intensity" },
];
const LEVELS = ["high", "medium", "low"];
const SOURCES = ["BBC", "NPR", "The Guardian"];

const TONES = {
  high: { label: "High", dot: "bg-[#d9483b]", border: "border-l-[#d9483b]", text: "np-t-high", bars: 3 },
  medium: { label: "Medium", dot: "bg-[#e0a021]", border: "border-l-[#e0a021]", text: "np-t-med", bars: 2 },
  low: { label: "Low", dot: "bg-[#2f9e6e]", border: "border-l-[#2f9e6e]", text: "np-t-low", bars: 1 },
};

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3b6df0]";
const fieldClass = `np-field h-10 rounded-lg border px-3 text-sm ${focusRing}`;
const secondaryButton = `np-sbtn inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

/* Every colour lives in these variables, so light and dark are one switch. */
const THEME_CSS = `
:root{
  --bg:#f4f5f7;--surface:#fff;--sub:#f8f9fb;--hov:#f7f8fa;--open:#fafbfc;--panel:#f0f2f5;
  --track:#e3e6eb;--bar:#dfe3e9;--bd:#e3e6eb;--bd2:#e8ebf0;--bdf:#d5d9e0;--bdfh:#b9bfca;--dash:#c9cfd9;
  --ink:#16181d;--muted:#5b6472;--faint:#6f7887;--accent:#3b6df0;--link:#2a4fd6;
  --chip:#e4e9fb;--chiph:#d8dffa;--btn:#16181d;--btnh:#2b303a;--btni:#fff;
  --mark:#fde9a9;--marki:#16181d;--high:#b4352a;--med:#946400;--low:#1f7a52;
}
:root[data-theme="dark"]{
  color-scheme:dark;
  --bg:#0e1116;--surface:#161a22;--sub:#1b202a;--hov:#1c212b;--open:#1a1f29;--panel:#1f2530;
  --track:#2a303b;--bar:#333a47;--bd:#2a303b;--bd2:#232935;--bdf:#333a47;--bdfh:#465063;--dash:#3a4150;
  --ink:#e8eaee;--muted:#a0a8b6;--faint:#7d8697;--accent:#6b93ff;--link:#8aa9ff;
  --chip:#202a4a;--chiph:#29356a;--btn:#e8eaee;--btnh:#fff;--btni:#16181d;
  --mark:#6b5514;--marki:#fff3c4;--high:#ff8a7d;--med:#f2b84b;--low:#52c992;
}
.np-page{background:var(--bg);color:var(--ink)}
.np-toolbar{background:color-mix(in srgb,var(--bg) 90%,transparent)}
.np-card{background:var(--surface)}.np-sub{background:var(--sub)}.np-open{background:var(--open)}
.np-panel{background:var(--panel)}.np-track{background:var(--track)}.np-bar{background:var(--bar)}
.np-hov:hover{background:var(--hov)}.np-hovs:hover{background:var(--surface)}
.np-ink{color:var(--ink)}.np-muted{color:var(--muted)}.np-faint{color:var(--faint)}
.np-link{color:var(--link)}.np-accent{color:var(--accent)}
.np-t-high{color:var(--high)}.np-t-med{color:var(--med)}.np-t-low{color:var(--low)}
.np-bd{border-color:var(--bd)}.np-bd2{border-color:var(--bd2)}.np-bdf{border-color:var(--bdf)}.np-dash{border-color:var(--dash)}
.np-divide>*+*{border-color:var(--bd2)}
.np-field{background:var(--surface);border-color:var(--bdf);color:var(--ink)}
.np-field::placeholder{color:var(--faint)}.np-field:hover{border-color:var(--bdfh)}
.np-sbtn{background:var(--surface);border-color:var(--bdf);color:var(--ink)}
.np-sbtn:hover:not(:disabled){background:var(--hov)}
.np-btn{background:var(--btn);color:var(--btni)}.np-btn:hover:not(:disabled){background:var(--btnh)}
.np-chip{background:var(--chip);color:var(--link)}.np-chip:hover{background:var(--chiph)}
.np-mark{background:var(--mark);color:var(--marki)}
.np-chev{color:var(--faint);transition:color .15s}.group:hover .np-chev{color:var(--ink)}
.np-n-amber{border-color:#f0d58a;background:#fff8e6;color:#7a5200}
.np-n-green{border-color:#a9dcc3;background:#eefaf3;color:#1f6b48}
.np-n-red{border-color:#f2b8b1;background:#fdf0ee;color:#a3301f}
:root[data-theme="dark"] .np-n-amber{border-color:#5c4a12;background:#2a2210;color:#f0d58a}
:root[data-theme="dark"] .np-n-green{border-color:#1f5a41;background:#10261c;color:#7fd6ae}
:root[data-theme="dark"] .np-n-red{border-color:#6a2a22;background:#2c1512;color:#ff9d90}
@keyframes np-reveal{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.np-reveal{animation:np-reveal 160ms ease-out}
@media (prefers-reduced-motion:reduce){.np-reveal{animation:none}}
`;

export default function Home() {
  const [theme, setTheme] = useState("light");
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("latest");
  const [activeDay, setActiveDay] = useState(null);
  const [level, setLevel] = useState("all");
  const [selectedSources, setSelectedSources] = useState([]);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [clusterDetails, setClusterDetails] = useState({});
  const [clusterLoadingId, setClusterLoadingId] = useState(null);
  const [ingestStatus, setIngestStatus] = useState("idle");
  const [ingestError, setIngestError] = useState("");

  const mountedRef = useRef(true);
  const dismissTimerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(dismissTimerRef.current);
    };
  }, []);

  // Theme: use the saved choice, otherwise follow the system setting.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      let saved = null;
      try {
        saved = localStorage.getItem(THEME_KEY);
      } catch {}
      const nextTheme =
        saved === "dark" || saved === "light"
          ? saved
          : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      setTheme(nextTheme);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/timeline`, { signal });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const data = await response.json();
      setTimeline(Array.isArray(data.timeline) ? data.timeline : []);
      setUpdatedAt(new Date());
      setPage(1);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Timeline error:", err);
      setError("Couldn't load the News Pulse timeline.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void load(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  // Press "/" anywhere to jump to search.
  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName;
      if (e.key !== "/" || ["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- derived data ---------- */

  const prepared = useMemo(() => {
    const nums = timeline.map((c) => Number(c.intensity) || 0);
    const min = nums.length ? Math.min(...nums) : 0;
    const max = nums.length ? Math.max(...nums) : 0;
    return timeline.map((c, i) => {
      const start = toDate(c.start_time);
      const end = toDate(c.end_time) || start;
      const value = nums[i];
      const norm = max === min ? 0.5 : (value - min) / (max - min);
      return {
        ...c, start, end, value,
        startMs: start ? start.getTime() : 0,
        level: levelOf(norm),
        count: Number(c.article_count) || 0,
        sources: Array.isArray(c.sources)
          ? c.sources
          : c.source
          ? [c.source]
          : [],
        dayKey: start ? dayKey(start) : null,
        dayLabel: start ? formatDay(start) : "Unknown date",
      };
    });
  }, [timeline]);

  const totalArticles = useMemo(() => prepared.reduce((s, c) => s + c.count, 0), [prepared]);

  const days = useMemo(() => {
    const map = new Map();
    for (const c of prepared) {
      if (!c.dayKey) continue;
      const d = map.get(c.dayKey) || { key: c.dayKey, short: formatDayShort(c.start), ms: c.startMs, count: 0, clusters: 0 };
      d.count += c.count;
      d.clusters += 1;
      map.set(c.dayKey, d);
    }
    return [...map.values()].sort((a, b) => b.ms - a.ms);
  }, [prepared]);

  const peakDay = useMemo(() => Math.max(...days.map((d) => d.count), 1), [days]);

  const levelCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const c of prepared) counts[c.level] += 1;
    return counts;
  }, [prepared]);

  const sourceCounts = useMemo(() => {
    const counts = Object.fromEntries(SOURCES.map((source) => [source, 0]));
    for (const c of prepared) {
      for (const source of c.sources) {
        if (source in counts) counts[source] += 1;
      }
    }
    return counts;
  }, [prepared]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = prepared.filter(
      (c) =>
        (!activeDay || c.dayKey === activeDay) &&
        (level === "all" || c.level === level) &&
        (selectedSources.length === 0 ||
          selectedSources.some((source) => c.sources.includes(source))) &&
        (!q || String(c.label || "").toLowerCase().includes(q))
    );
    const sorters = {
      latest: (a, b) => b.startMs - a.startMs,
      oldest: (a, b) => a.startMs - b.startMs,
      articles: (a, b) => b.count - a.count,
      intensity: (a, b) => b.value - a.value,
    };
    return list.sort(sorters[sort]);
  }, [prepared, query, activeDay, level, selectedSources, sort]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = useMemo(() => visible.slice(pageStart, pageStart + PAGE_SIZE), [visible, pageStart]);

  // Only time-based sorts are grouped under day headings.
  const groups = useMemo(() => {
    if (sort !== "latest" && sort !== "oldest") return [{ key: "all", label: null, items: pageItems }];
    const out = [];
    for (const c of pageItems) {
      const key = c.dayKey || "unknown";
      let group = out[out.length - 1];
      if (!group || group.key !== key) {
        group = { key, label: c.dayLabel, items: [] };
        out.push(group);
      }
      group.items.push(c);
    }
    return out;
  }, [pageItems, sort]);

  const hasData = timeline.length > 0;
  const filtersActive = Boolean(
    query.trim() ||
      activeDay ||
      level !== "all" ||
      selectedSources.length > 0
  );
  const ingesting = ingestStatus === "starting" || ingestStatus === "running";
  const dark = theme === "dark";

  /* ---------- handlers (every filter change returns to page 1) ---------- */

  const changeQuery = (v) => { setQuery(v); setPage(1); };
  const changeSort = (v) => { setSort(v); setPage(1); };
  const changeDay = (key) => { setActiveDay((cur) => (cur === key ? null : key)); setPage(1); };
  const changeLevel = (v) => { setLevel(v); setPage(1); };
  const changeSource = (source) => {
    setSelectedSources((current) =>
      current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source]
    );
    setPage(1);
  };
  const clearSources = () => { setSelectedSources([]); setPage(1); };
  const clearFilters = () => {
    setQuery("");
    setActiveDay(null);
    setLevel("all");
    setSelectedSources([]);
    setPage(1);
  };

  function goToPage(next) {
    setPage(Math.min(Math.max(next, 1), totalPages));
    setTimeout(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      listRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }, 0);
  }

  async function loadClusterDetails(clusterId) {
    try {
      setClusterLoadingId(clusterId);
      const response = await fetch(`${API_BASE_URL}/clusters/${clusterId}`);
      if (!response.ok) throw new Error(`Cluster request failed: ${response.status}`);
      const data = await response.json();
      setClusterDetails((cur) => ({ ...cur, [clusterId]: data }));
    } catch (err) {
      console.error("Cluster detail error:", err);
      setClusterDetails((cur) => ({ ...cur, [clusterId]: { error: "Unable to load cluster articles." } }));
    } finally {
      setClusterLoadingId((cur) => (cur === clusterId ? null : cur));
    }
  }

  async function toggleCluster(clusterId) {
    if (openId === clusterId) return setOpenId(null);
    setOpenId(clusterId);
    const cached = clusterDetails[clusterId];
    if (cached && !cached.error) return;
    await loadClusterDetails(clusterId);
  }

  async function runIngestion() {
    const POLL_MS = 1000;
    const MAX_POLLS = 300;
    try {
      clearTimeout(dismissTimerRef.current);
      setIngestStatus("starting");
      setIngestError("");

      const response = await fetch(`${API_BASE_URL}/ingest/trigger`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start ingestion.");

      const jobId = data.jobId;
      setIngestStatus("running");

      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        if (!mountedRef.current) return;

        const statusResponse = await fetch(`${API_BASE_URL}/ingest/status/${jobId}`);
        const statusData = await statusResponse.json();
        if (!statusResponse.ok) throw new Error(statusData.error || "Failed to check ingestion status.");

        if (statusData.status === "completed") {
          setIngestStatus("completed");
          dismissTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setIngestStatus("idle");
          }, 5000);
          await load();
          setClusterDetails({});
          setOpenId(null);
          return;
        }
        if (statusData.status === "failed") throw new Error(statusData.error || "Ingestion failed.");
      }
      throw new Error("Ingestion is taking longer than expected. Check the backend logs.");
    } catch (err) {
      console.error("Ingestion error:", err);
      if (!mountedRef.current) return;
      setIngestStatus("failed");
      setIngestError(err.message || "Unable to run ingestion.");
    }
  }

  const ingestLabel =
    { starting: "Starting...", running: "Ingesting...", completed: "Run again", failed: "Retry" }[ingestStatus] ||
    "Run ingestion";

  /* ---------- render ---------- */

  return (
    <main className={`${font.className} np-page min-h-screen antialiased`}>
      <style>{THEME_CSS}</style>

      {/* TOP BAR */}
      <header className="np-card np-bd border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="np-btn flex h-9 w-9 items-center justify-center rounded-lg">
              <Icon name="pulse" size={18} />
            </span>
            <span className="text-base font-semibold tracking-tight">News Pulse</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {updatedAt && <span className="np-faint text-xs">Updated {formatClock(updatedAt)}</span>}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className={secondaryButton}
            >
              <Icon name={dark ? "sun" : "moon"} size={14} />
              {dark ? "Light" : "Dark"}
            </button>

            <button type="button" onClick={() => load()} disabled={loading || ingesting} className={secondaryButton}>
              <Icon name="refresh" size={14} className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
              {loading ? "Refreshing" : "Refresh timeline"}
            </button>

            <button
              type="button"
              onClick={runIngestion}
              disabled={ingesting}
              className={`np-btn inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
            >
              {ingestLabel}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Topic timeline</h1>
          <p className="np-muted mt-3 text-base leading-7">
            Stories from different news sources, grouped by topic and ordered by time. Select a topic to read its articles.
          </p>
        </div>

        {/* INGESTION STATUS */}
        {ingesting && (
          <Notice tone="amber" role="status" spinner>
            <p className="font-medium">{ingestStatus === "starting" ? "Starting ingestion..." : "Fetching and clustering news..."}</p>
            <p className="mt-1 text-xs opacity-80">
              The Python pipeline is running. The timeline will refresh automatically when it finishes.
            </p>
          </Notice>
        )}
        {ingestStatus === "completed" && (
          <Notice tone="green" role="status">
            <p className="font-medium">Ingestion completed successfully.</p>
            <p className="mt-1 text-xs opacity-80">Timeline and topic clusters have been refreshed.</p>
          </Notice>
        )}
        {ingestStatus === "failed" && (
          <Notice tone="red" role="alert">
            <p className="font-medium">Ingestion failed.</p>
            <p className="mt-1 text-xs opacity-80">{ingestError}</p>
          </Notice>
        )}

        {/* ERROR */}
        {error && (
          <Notice
            tone="red"
            role="alert"
            action={
              <button type="button" onClick={() => load()} className={`h-9 rounded-lg bg-[#d9483b] px-4 text-sm font-medium text-white hover:bg-[#c23f33] ${focusRing}`}>
                Try again
              </button>
            }
          >
            <p className="font-medium">{error}</p>
            <p className="mt-1 text-xs opacity-80">Check that the backend is running and reachable at {API_BASE_URL}.</p>
          </Notice>
        )}

        {loading && !hasData && !error && <Skeleton />}

        {/* CONTENT */}
        {hasData && (
          <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
            {/* SIDEBAR */}
            <aside className="space-y-8 lg:sticky lg:top-6 lg:self-start">
              <section aria-labelledby="overview-heading">
                <h2 id="overview-heading" className="text-sm font-semibold">Overview</h2>
                <dl className="np-divide np-bd np-card mt-3 divide-y rounded-xl border text-sm">
                  <Stat label="Topic clusters" value={timeline.length} />
                  <Stat label="Articles indexed" value={totalArticles} />
                  <Stat label="Coverage window" value="7 days" note="Fresh news only" />
                  <Stat label="Sources" value="BBC, NPR, The Guardian" />
                </dl>
              </section>

              <section aria-labelledby="sources-heading">
                <h2 id="sources-heading" className="text-sm font-semibold">Sources</h2>
                <p className="np-faint mt-1 text-xs">
                  Toggle which news sources are included.
                </p>
                {prepared.every((cluster) => cluster.sources.length === 0) && (
                  <p className="np-t-med mt-2 text-[11px]">
                    Source metadata is unavailable from the timeline API.
                  </p>
                )}
                <ul className="mt-3 space-y-1">
                  <SourceOption
                    label="All sources"
                    count={prepared.length}
                    selected={selectedSources.length === 0}
                    onSelect={clearSources}
                  />
                  {SOURCES.map((source) => (
                    <SourceOption
                      key={source}
                      label={source}
                      count={sourceCounts[source]}
                      selected={selectedSources.includes(source)}
                      onSelect={() => changeSource(source)}
                    />
                  ))}
                </ul>
              </section>

              <section aria-labelledby="intensity-heading">
                <h2 id="intensity-heading" className="text-sm font-semibold">Intensity</h2>
                <p className="np-faint mt-1 text-xs">Colour shows how intense the coverage of a topic is.</p>
                <ul className="mt-3 space-y-1">
                  <LevelOption label="All levels" count={prepared.length} selected={level === "all"} onSelect={() => changeLevel("all")} />
                  {LEVELS.map((key) => (
                    <LevelOption
                      key={key}
                      label={TONES[key].label}
                      dot={TONES[key].dot}
                      count={levelCounts[key]}
                      selected={level === key}
                      onSelect={() => changeLevel(key)}
                    />
                  ))}
                </ul>
              </section>

              {days.length > 0 && (
                <section aria-labelledby="days-heading">
                  <h2 id="days-heading" className="text-sm font-semibold">Articles by day</h2>
                  <p className="np-faint mt-1 text-xs">Select a day to show only that day.</p>
                  <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
                    {days.map((d) => {
                      const selected = activeDay === d.key;
                      return (
                        <li key={d.key}>
                          <button
                            type="button"
                            aria-pressed={selected}
                            onClick={() => changeDay(d.key)}
                            title={`${d.clusters} clusters`}
                            className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${focusRing} ${
                              selected ? "np-card ring-1 ring-[#3b6df0]" : "np-hovs"
                            }`}
                          >
                            <span className="flex items-baseline justify-between text-sm">
                              <span className={selected ? "font-semibold" : ""}>{d.short}</span>
                              <span className="np-muted tabular-nums">
                                {d.count}
                                <span className="sr-only"> articles</span>
                              </span>
                            </span>
                            <span className="np-track mt-1.5 block h-1.5 rounded-full">
                              <span className="block h-full rounded-full bg-[#3b6df0]" style={{ width: `${(d.count / peakDay) * 100}%` }} />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </aside>

            {/* MAIN */}
            <section aria-label="Topic clusters" className="min-w-0">
              <div className="np-toolbar sticky top-0 z-20 -mx-1 px-1 pb-3 pt-1 backdrop-blur">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-0 flex-1 basis-64">
                    <label className="sr-only" htmlFor="cluster-search">Search topics</label>
                    <Icon name="search" className="np-faint pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={searchRef}
                      id="cluster-search"
                      type="search"
                      value={query}
                      onChange={(e) => changeQuery(e.target.value)}
                      placeholder="Search topics"
                      className={`${fieldClass} w-full pl-9 pr-9`}
                    />
                    {!query && (
                      <kbd className="np-bdf np-faint pointer-events-none absolute right-3 top-1/2 hidden h-5 -translate-y-1/2 items-center rounded border px-1.5 text-[11px] sm:flex">
                        /
                      </kbd>
                    )}
                  </div>

                  <label className="sr-only" htmlFor="cluster-sort">Sort topics</label>
                  <select id="cluster-sort" value={sort} onChange={(e) => changeSort(e.target.value)} className={fieldClass}>
                    {SORTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <p aria-live="polite" className="np-muted">
                  {visible.length === 0
                    ? "No clusters"
                    : `Showing ${pageStart + 1}\u2013${Math.min(pageStart + PAGE_SIZE, visible.length)} of ${visible.length} clusters`}
                </p>
                {activeDay && <FilterChip label={days.find((d) => d.key === activeDay)?.short} onRemove={() => changeDay(activeDay)} />}
                {level !== "all" && <FilterChip label={`${TONES[level].label} intensity`} onRemove={() => changeLevel("all")} />}
                {selectedSources.map((source) => (
                  <FilterChip
                    key={source}
                    label={source}
                    onRemove={() => changeSource(source)}
                  />
                ))}
                {filtersActive && (
                  <button type="button" onClick={clearFilters} className={`np-accent rounded px-1 hover:underline ${focusRing}`}>
                    Clear all
                  </button>
                )}
              </div>

              {visible.length === 0 ? (
                <div className="np-dash np-card rounded-xl border border-dashed px-6 py-14 text-center">
                  <p className="text-lg font-semibold">No clusters match these filters</p>
                  <p className="np-muted mt-2 text-sm">Try a different search term, day or intensity level.</p>
                  <button type="button" onClick={clearFilters} className={`np-btn mt-5 h-10 rounded-lg px-4 text-sm font-semibold ${focusRing}`}>
                    Clear filters
                  </button>
                </div>
              ) : (
                <div ref={listRef} className="np-bd np-card scroll-mt-24 overflow-hidden rounded-xl border">
                  {groups.map((group) => (
                    <section key={group.key}>
                      {group.label && (
                        <h2 className="np-bd2 np-sub np-muted border-b px-5 py-2 text-xs font-semibold">{group.label}</h2>
                      )}
                      <ul>
                        {group.items.map((cluster, i) => (
                          <TimelineRow
                            key={cluster.id ?? `${group.key}-${i}`}
                            cluster={cluster}
                            query={query}
                            totalArticles={totalArticles}
                            sourceFilter={selectedSources}
                            open={openId === cluster.id}
                            details={clusterDetails[cluster.id]}
                            loadingDetails={clusterLoadingId === cluster.id}
                            onToggle={() => toggleCluster(cluster.id)}
                            onRetry={() => loadClusterDetails(cluster.id)}
                          />
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}

              {visible.length > PAGE_SIZE && (
                <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-4">
                  <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} className={`${secondaryButton} h-9 px-3`}>
                    <Icon name="left" />
                    Previous
                  </button>
                  <p className="np-muted text-sm">Page {currentPage} of {totalPages}</p>
                  <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages} className={`${secondaryButton} h-9 px-3`}>
                    Next
                    <Icon name="right" />
                  </button>
                </nav>
              )}
            </section>
          </div>
        )}

        {/* EMPTY BACKEND */}
        {!loading && !error && !hasData && (
          <div className="np-dash np-card rounded-xl border border-dashed px-6 py-16 text-center">
            <p className="text-lg font-semibold">No clusters yet</p>
            <p className="np-muted mt-2 text-sm">
              The backend responded, but it has not returned any topic clusters. Run ingestion to fetch and group the latest news.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

/* ---------- components ---------- */

function TimelineRow({
  cluster,
  query,
  totalArticles,
  sourceFilter = [],
  open,
  details,
  loadingDetails,
  onToggle,
  onRetry,
}) {
  const tone = TONES[cluster.level];
  const share = totalArticles ? Math.round((cluster.count / totalArticles) * 100) : 0;
  const panelId = `cluster-panel-${cluster.id}`;
  const allStories = Array.isArray(details?.articles) ? details.articles : [];
  const stories =
    sourceFilter.length === 0
      ? allStories
      : allStories.filter((story) => sourceFilter.includes(story.source));

  return (
    <li className={`np-bd2 border-b last:border-b-0 ${open ? "np-open" : ""}`}>
      <div className={`np-hov group relative flex flex-col gap-3 border-l-[3px] px-5 py-4 transition-colors sm:flex-row sm:items-start sm:justify-between sm:gap-6 ${tone.border}`}>
        <div className="min-w-0 flex-1">
          <p className="np-faint text-xs">{formatRange(cluster.start, cluster.end)}</p>
          <h3 className="mt-1 text-[17px] font-semibold leading-snug">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-controls={panelId}
              className={`rounded text-left after:absolute after:inset-0 after:content-[''] ${focusRing}`}
            >
              <Highlight text={cluster.label || "Untitled cluster"} query={query} />
            </button>
          </h3>
          <p className="np-muted mt-1.5 text-sm">
            {cluster.count} {cluster.count === 1 ? "article" : "articles"}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <Meter level={cluster.level} value={cluster.value} />
          <Icon name={open ? "up" : "down"} size={18} className="np-chev shrink-0" />
        </div>
      </div>

      {open && (
        <div id={panelId} className="np-reveal border-l-[3px] border-l-transparent px-5 pb-5">
          <dl className="np-panel grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg p-4 text-sm sm:grid-cols-4">
            <Fact label="First story" value={formatFull(cluster.start)} />
            <Fact label="Latest story" value={formatFull(cluster.end)} />
            <Fact label="Duration" value={formatDuration(cluster.start, cluster.end)} />
            <Fact label="Share of all articles" value={`${share}%`} />
          </dl>

          {loadingDetails && (
            <div role="status" className="mt-5 space-y-3" aria-label="Loading articles">
              {[0, 1].map((n) => (
                <div key={n} className="animate-pulse motion-reduce:animate-none">
                  <div className="np-track h-3 w-28 rounded" />
                  <div className="np-track mt-2 h-4 w-3/4 rounded" />
                </div>
              ))}
            </div>
          )}

          {!loadingDetails && details?.error && (
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              <p className="np-t-high">{details.error}</p>
              <button type="button" onClick={onRetry} className={`np-accent rounded font-medium hover:underline ${focusRing}`}>
                Try again
              </button>
            </div>
          )}

          {!loadingDetails && !details?.error && stories.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-baseline justify-between">
                <h4 className="text-sm font-semibold">Articles in this cluster</h4>
                <span className="np-faint text-xs">
                  {stories.length} {stories.length === 1 ? "story" : "stories"}
                </span>
              </div>

              <ul className="np-divide divide-y">
                {stories.map((story, index) => (
                  <li key={story.id ?? index} className="py-3 first:pt-1">
                    <div className="flex flex-wrap items-center gap-x-3 text-xs">
                      {story.source && <span className="np-ink font-semibold">{story.source}</span>}
                      {story.published_at && <span className="np-faint">{formatFull(toDate(story.published_at))}</span>}
                    </div>

                    {story.url ? (
                      <a
                        href={story.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`np-link mt-1 inline-flex items-start gap-1.5 rounded font-medium hover:underline ${focusRing}`}
                      >
                        {story.title || "Untitled article"}
                        <Icon name="ext" size={14} className="mt-1 shrink-0" />
                      </a>
                    ) : (
                      <p className="mt-1 font-medium">{story.title || "Untitled article"}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!loadingDetails && !details?.error && details && stories.length === 0 && (
            <p className="np-faint mt-5 text-sm">No articles were returned for this cluster.</p>
          )}
        </div>
      )}
    </li>
  );
}

function Meter({ level, value }) {
  const tone = TONES[level];
  const shown = Number.isInteger(value) ? value : value.toFixed(1);

  return (
    <div className="flex shrink-0 items-center gap-2.5 text-sm" title={`Intensity score: ${shown}`}>
      <span className="flex items-end gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`w-1 rounded-sm ${n <= tone.bars ? tone.dot : "np-bar"}`} style={{ height: 6 + n * 4 }} />
        ))}
      </span>
      <span className={`font-medium ${tone.text}`}>
        {tone.label}
        <span className="sr-only"> intensity</span>
      </span>
      <span className="np-faint tabular-nums">{shown}</span>
    </div>
  );
}

function Highlight({ text, query }) {
  const q = query.trim();
  const value = String(text);
  if (!q) return value;
  // The capture group puts matches at the odd positions of the result.
  const parts = value.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="np-mark rounded px-0.5">{part}</mark>
    ) : (
      part
    )
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="np-muted">{label}</dt>
      <dd className="text-right font-semibold tabular-nums">
        {value}
        {note && <span className="np-faint block text-xs font-normal">{note}</span>}
      </dd>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <dt className="np-faint text-xs">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function SourceOption({ label, count, selected, onSelect }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${focusRing} ${
          selected ? "np-card font-semibold ring-1 ring-[#3b6df0]" : "np-hovs"
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex h-4 w-4 items-center justify-center rounded border text-[11px] ${
            selected
              ? "border-[#3b6df0] bg-[#3b6df0] text-white"
              : "np-bdf"
          }`}
        >
          {selected ? "✓" : ""}
        </span>
        <span className="flex-1">{label}</span>
        <span className="np-muted font-normal tabular-nums">{count}</span>
      </button>
    </li>
  );
}

function LevelOption({ label, dot, count, selected, onSelect }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${focusRing} ${
          selected ? "np-card font-semibold ring-1 ring-[#3b6df0]" : "np-hovs"
        }`}
      >
        <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${dot || "np-bdf border"}`} />
        <span className="flex-1">{label}</span>
        <span className="np-muted font-normal tabular-nums">{count}</span>
      </button>
    </li>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className={`np-chip inline-flex h-7 items-center gap-1.5 rounded-full pl-3 pr-2 text-xs font-medium ${focusRing}`}
    >
      {label}
      <span aria-hidden="true">&times;</span>
      <span className="sr-only">Remove filter</span>
    </button>
  );
}

function Notice({ tone, role, spinner = false, action, children }) {
  return (
    <div role={role} className={`np-n-${tone} mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-4 text-sm`}>
      <div className="flex items-center gap-3">
        {spinner && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />}
        <div>{children}</div>
      </div>
      {action}
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading timeline" className="np-bd np-card overflow-hidden rounded-xl border">
      {[0, 1, 2, 3, 4].map((n) => (
        <div key={n} className="np-bd2 animate-pulse border-b px-5 py-5 last:border-b-0 motion-reduce:animate-none">
          <div className="np-track h-3 w-32 rounded" />
          <div className="np-track mt-3 h-5 w-2/3 rounded" />
          <div className="np-track mt-3 h-3 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

const ICONS = {
  pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />,
  refresh: (<><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  ext: (<><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>),
  down: <path d="m6 9 6 6 6-6" />,
  up: <path d="m6 15 6-6 6 6" />,
  left: <path d="m15 6-6 6 6 6" />,
  right: <path d="m9 6 6 6-6 6" />,
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
};

function Icon({ name, size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {ICONS[name]}
    </svg>
  );
}

/* ---------- helpers ---------- */

function levelOf(norm) {
  if (norm >= 0.66) return "high";
  if (norm >= 0.33) return "medium";
  return "low";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

const formatDay = (date) =>
  date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const formatDayShort = (date) =>
  date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

const formatClock = (date) =>
  date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function formatFull(date) {
  if (!date) return "Unknown";
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatRange(start, end) {
  if (!start) return "Time unknown";
  if (!end || end.getTime() === start.getTime()) return formatClock(start);
  if (dayKey(start) === dayKey(end)) return `${formatClock(start)} \u2013 ${formatClock(end)}`;
  const short = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${short(start)}, ${formatClock(start)} \u2013 ${short(end)}, ${formatClock(end)}`;
}

function formatDuration(start, end) {
  if (!start || !end) return "Unknown";
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (minutes < 1) return "Single moment";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}