"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Newsreader, Instrument_Sans } from "next/font/google";

const serif = Newsreader({ subsets: ["latin"], display: "swap" });
const sans = Instrument_Sans({ subsets: ["latin"], display: "swap" });

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001";

const SORTS = [
  { value: "latest", label: "Latest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "articles", label: "Most articles" },
  { value: "intensity", label: "Highest intensity" },
];

// Intensity is shown as a three-step heat scale: teal -> amber -> coral.
const TONES = {
  high: { label: "High", dot: "bg-[#ef6a55]", text: "text-[#f08a78]", bars: 3 },
  medium: { label: "Medium", dot: "bg-[#f2b134]", text: "text-[#f2b134]", bars: 2 },
  low: { label: "Low", dot: "bg-[#4fb3a9]", text: "text-[#6cc7bd]", bars: 1 },
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2b134] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10151c]";

const fieldClass = `h-10 rounded-lg border border-[#26303c] bg-[#171e27] px-3 text-sm text-[#e8e4dc] placeholder:text-[#6b7685] ${focusRing}`;

export default function Home() {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("latest");
  const [activeDay, setActiveDay] = useState(null);
  const [openId, setOpenId] = useState(null);

  const [clusterDetails, setClusterDetails] = useState({});
  const [clusterLoadingId, setClusterLoadingId] = useState(null);

  const [ingestStatus, setIngestStatus] = useState("idle");
  const [ingestError, setIngestError] = useState("");
  const mountedRef = useRef(true);
  const dismissTimerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(dismissTimerRef.current);
    };
  }, []);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/timeline`, { signal });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      setTimeline(Array.isArray(data.timeline) ? data.timeline : []);
      setUpdatedAt(new Date());
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

  const timeoutId = window.setTimeout(() => {
    void load(controller.signal);
  }, 0);

  return () => {
    window.clearTimeout(timeoutId);
    controller.abort();
  };
  }, [load]);

  // Normalise each cluster once so the rest of the UI stays simple.
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
        ...c,
        start,
        end,
        startMs: start ? start.getTime() : 0,
        value,
        norm,
        level: levelOf(norm),
        count: Number(c.article_count) || 0,
        dayKey: start ? dayKey(start) : null,
        dayLabel: start ? formatDay(start) : "Unknown date",
      };
    });
  }, [timeline]);

  const totalArticles = useMemo(
    () => prepared.reduce((sum, c) => sum + c.count, 0),
    [prepared]
  );

  const maxCount = useMemo(
    () => Math.max(...prepared.map((c) => c.count), 1),
    [prepared]
  );

  const days = useMemo(() => {
    const map = new Map();

    for (const c of prepared) {
      if (!c.dayKey) continue;
      const d = map.get(c.dayKey) || {
        key: c.dayKey,
        label: c.dayLabel,
        ms: c.startMs,
        count: 0,
        clusters: 0,
        top: 0,
      };
      d.count += c.count;
      d.clusters += 1;
      d.top = Math.max(d.top, c.norm);
      map.set(c.dayKey, d);
    }

    return [...map.values()]
      .sort((a, b) => a.ms - b.ms)
      .map((d) => ({ ...d, level: levelOf(d.top) }));
  }, [prepared]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = prepared.filter(
      (c) =>
        (!activeDay || c.dayKey === activeDay) &&
        (!q || String(c.label || "").toLowerCase().includes(q))
    );

    const sorters = {
      latest: (a, b) => b.startMs - a.startMs,
      oldest: (a, b) => a.startMs - b.startMs,
      articles: (a, b) => b.count - a.count,
      intensity: (a, b) => b.value - a.value,
    };

    return list.sort(sorters[sort]);
  }, [prepared, query, activeDay, sort]);

  // Only time-based sorts are grouped under day headings.
  const groups = useMemo(() => {
    if (sort !== "latest" && sort !== "oldest") {
      return [{ key: "all", label: null, items: visible }];
    }

    const out = [];
    for (const c of visible) {
      const key = c.dayKey || "unknown";
      let group = out[out.length - 1];
      if (!group || group.key !== key) {
        group = { key, label: c.dayLabel, items: [] };
        out.push(group);
      }
      group.items.push(c);
    }
    return out;
  }, [visible, sort]);

  const hasData = timeline.length > 0;
  const filtersActive = Boolean(query.trim() || activeDay);

  function clearFilters() {
    setQuery("");
    setActiveDay(null);
  }

  async function toggleCluster(clusterId) {
    // Close the currently open cluster
    if (openId === clusterId) {
      setOpenId(null);
      return;
    }

    // Open the cluster immediately
    setOpenId(clusterId);

    // Don't request the same cluster again (but retry after an error)
    const cached = clusterDetails[clusterId];
    if (cached && !cached.error) {
      return;
    }

    try {
      setClusterLoadingId(clusterId);

      const response = await fetch(`${API_BASE_URL}/clusters/${clusterId}`);

      if (!response.ok) {
        throw new Error(`Cluster request failed: ${response.status}`);
      }

      const data = await response.json();

      setClusterDetails((current) => ({
        ...current,
        [clusterId]: data,
      }));
    } catch (err) {
      console.error("Cluster detail error:", err);

      setClusterDetails((current) => ({
        ...current,
        [clusterId]: {
          error: "Unable to load cluster articles.",
        },
      }));
    } finally {
      setClusterLoadingId((current) =>
        current === clusterId ? null : current
      );
    }
  }

  async function runIngestion() {
    const POLL_MS = 1000;
    const MAX_POLLS = 300; // stop waiting after about 5 minutes

    try {
      clearTimeout(dismissTimerRef.current);
      setIngestStatus("starting");
      setIngestError("");

      const response = await fetch(`${API_BASE_URL}/ingest/trigger`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start ingestion.");
      }

      const jobId = data.jobId;

      setIngestStatus("running");

      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));

        // Stop quietly if the page was closed while the job was running.
        if (!mountedRef.current) return;

        const statusResponse = await fetch(
          `${API_BASE_URL}/ingest/status/${jobId}`
        );

        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(
            statusData.error || "Failed to check ingestion status."
          );
        }

        if (statusData.status === "completed") {
          setIngestStatus("completed");

          // Hide the success message after 5 seconds.
          dismissTimerRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setIngestStatus("idle");
            }
          }, 5000);

          // Reload the timeline after Python ingestion and clustering finish.
          await load();

          // Clusters may have changed, so drop cached article lists.
          setClusterDetails({});
          setOpenId(null);

          return;
        }

        if (statusData.status === "failed") {
          throw new Error(statusData.error || "Ingestion failed.");
        }
      }

      throw new Error(
        "Ingestion is taking longer than expected. Check the backend logs."
      );
    } catch (err) {
      console.error("Ingestion error:", err);

      if (!mountedRef.current) return;

      setIngestStatus("failed");
      setIngestError(err.message || "Unable to run ingestion.");
    }
  }

  return (
    <main
      className={`${sans.className} min-h-screen bg-[#10151c] text-[#e8e4dc] antialiased`}
    >
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-14">
        {/* HEADER */}
        <header className="mb-12 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-medium text-[#f2b134]">
              <PulseMark />
              News Pulse
            </div>

            <h1
              className={`${serif.className} mt-5 text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl`}
            >
              Every story, grouped by topic and placed in time
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-[#8b95a3]">
              Related articles from different sources are clustered into topics.
              A larger dot means more articles; its colour shows how intense the
              coverage is.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#6b7685]">
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#4fb3a9]" />
                Low
              </span>

              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#f2b134]" />
                Medium
              </span>

              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#ef6a55]" />
                High
              </span>

              <span>3 sources · BBC · NPR · The Guardian</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {updatedAt && (
              <span className="text-xs text-[#6b7685]">
                Updated {formatClock(updatedAt)}
              </span>
            )}

            <button
              type="button"
              onClick={() => load()}
              disabled={
                loading ||
                ingestStatus === "starting" ||
                ingestStatus === "running"
              }
              className={`inline-flex h-10 items-center gap-2 rounded-lg border border-[#26303c] bg-[#171e27] px-4 text-sm font-medium text-[#e8e4dc] transition-colors hover:bg-[#1d2631] disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
            >
              <RefreshIcon spinning={loading} />
              {loading ? "Refreshing" : "Refresh timeline"}
            </button>

            <button
              type="button"
              onClick={runIngestion}
              disabled={
                ingestStatus === "starting" || ingestStatus === "running"
              }
              className={`inline-flex h-10 items-center gap-2 rounded-lg bg-[#f2b134] px-4 text-sm font-semibold text-[#10151c] transition-colors hover:bg-[#f6c65d] disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
            >
              {ingestStatus === "starting"
                ? "Starting..."
                : ingestStatus === "running"
                ? "Ingesting..."
                : ingestStatus === "completed"
                ? "Run again"
                : ingestStatus === "failed"
                ? "Retry"
                : "Run ingestion"}
            </button>
          </div>
        </header>

        {/* INGESTION STATUS */}
        {(ingestStatus === "starting" || ingestStatus === "running") && (
          <div
            role="status"
            className="mb-8 rounded-lg border border-[#f2b134]/30 bg-[#f2b134]/10 px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#26303c] border-t-[#f2b134] motion-reduce:animate-none" />

              <div>
                <p className="font-medium text-[#f2b134]">
                  {ingestStatus === "starting"
                    ? "Starting ingestion..."
                    : "Fetching and clustering news..."}
                </p>

                <p className="mt-1 text-xs text-[#8b95a3]">
                  The Python pipeline is running. The timeline will refresh
                  automatically when it finishes.
                </p>
              </div>
            </div>
          </div>
        )}

        {ingestStatus === "completed" && (
          <div
            role="status"
            className="mb-8 rounded-lg border border-[#4fb3a9]/30 bg-[#4fb3a9]/10 px-5 py-4"
          >
            <p className="font-medium text-[#6cc7bd]">
              Ingestion completed successfully.
            </p>

            <p className="mt-1 text-xs text-[#8b95a3]">
              Timeline and topic clusters have been refreshed.
            </p>
          </div>
        )}

        {ingestStatus === "failed" && (
          <div
            role="alert"
            className="mb-8 rounded-lg border border-[#ef6a55]/30 bg-[#ef6a55]/10 px-5 py-4"
          >
            <p className="font-medium text-[#f08a78]">Ingestion failed.</p>

            <p className="mt-1 text-xs text-[#8b95a3]">{ingestError}</p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#ef6a55]/30 bg-[#ef6a55]/10 px-5 py-4"
          >
            <div>
              <p className="font-medium text-[#f5a798]">{error}</p>
              <p className="mt-1 text-sm text-[#8b95a3]">
                Check that the backend is running and reachable at {API_BASE_URL}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => load()}
              className={`h-9 rounded-lg bg-[#ef6a55] px-4 text-sm font-medium text-[#10151c] hover:bg-[#f27d6a] ${focusRing}`}
            >
              Try again
            </button>
          </div>
        )}

        {/* LOADING (first load only) */}
        {loading && !hasData && !error && <Skeleton />}

        {/* CONTENT */}
        {hasData && (
          <>
            {/* SUMMARY */}
            <dl className="mb-10 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-[#26303c] py-6 sm:grid-cols-3">
              <Summary label="Topic clusters" value={timeline.length} />
              <Summary label="Articles indexed" value={totalArticles} />
              <Summary
                label="Coverage window"
                value="7 days"
                note="Fresh news only"
                small
              />
            </dl>

            <PulseChart days={days} activeDay={activeDay} onSelect={setActiveDay} />

            {/* CONTROLS */}
            <section
              aria-label="Filter and sort"
              className="mb-6 flex flex-wrap items-center gap-3"
            >
              <label className="sr-only" htmlFor="cluster-search">
                Search clusters
              </label>
              <input
                id="cluster-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search topics"
                className={`${fieldClass} w-full sm:w-72`}
              />

              <label className="sr-only" htmlFor="cluster-sort">
                Sort clusters
              </label>
              <select
                id="cluster-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className={fieldClass}
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              {activeDay && (
                <button
                  type="button"
                  onClick={() => setActiveDay(null)}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg border border-[#f2b134]/40 bg-[#f2b134]/10 px-3 text-sm text-[#f2b134] ${focusRing}`}
                >
                  {days.find((d) => d.key === activeDay)?.label}
                  <span aria-hidden="true">×</span>
                  <span className="sr-only">Clear day filter</span>
                </button>
              )}

              <p
                aria-live="polite"
                className="ml-auto text-sm text-[#6b7685]"
              >
                {visible.length} of {timeline.length} clusters
              </p>
            </section>

            {/* TIMELINE */}
            {visible.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#26303c] px-6 py-14 text-center">
                <p className={`${serif.className} text-xl`}>
                  No clusters match these filters
                </p>
                <p className="mt-2 text-sm text-[#8b95a3]">
                  Try a different search term or pick another day.
                </p>
                {filtersActive && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={`mt-5 h-9 rounded-lg bg-[#e8e4dc] px-4 text-sm font-medium text-[#10151c] hover:bg-white ${focusRing}`}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div>
                {groups.map((group) => (
                  <section key={group.key} className="mb-2">
                    {group.label && (
                      <h2 className="sticky top-0 z-10 -mx-2 flex items-baseline justify-between bg-[#10151c]/90 px-2 py-3 text-sm font-medium backdrop-blur">
                        {group.label}
                        <span className="text-xs font-normal text-[#6b7685]">
                          {group.items.length}{" "}
                          {group.items.length === 1 ? "cluster" : "clusters"}
                        </span>
                      </h2>
                    )}

                    <ol className="ml-1">
                      {group.items.map((cluster, i) => (
                        <TimelineRow
                          key={cluster.id ?? `${group.key}-${i}`}
                          cluster={cluster}
                          maxCount={maxCount}
                          totalArticles={totalArticles}
                          open={openId === cluster.id}
                          details={clusterDetails[cluster.id]}
                          loadingDetails={clusterLoadingId === cluster.id}
                          onToggle={() => toggleCluster(cluster.id)}
                        />
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            )}
          </>
        )}

        {/* EMPTY BACKEND */}
        {!loading && !error && !hasData && (
          <div className="rounded-lg border border-dashed border-[#26303c] px-6 py-16 text-center">
            <p className={`${serif.className} text-xl`}>No clusters yet</p>
            <p className="mt-2 text-sm text-[#8b95a3]">
              The backend responded, but it has not returned any topic clusters.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

/* ---------- components ---------- */

function PulseChart({ days, activeDay, onSelect }) {
  if (days.length === 0) return null;

  const peak = Math.max(...days.map((d) => d.count), 1);

  return (
    <section aria-labelledby="pulse-heading" className="mb-12">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id="pulse-heading" className="text-sm font-medium">
          Coverage by day
        </h2>
        <p className="text-xs text-[#6b7685]">
          Select a bar to show that day only
        </p>
      </div>

      <div className="flex h-28 items-end gap-1 border-b border-[#26303c]">
        {days.map((d) => {
          const selected = activeDay === d.key;
          const dimmed = activeDay && !selected;

          return (
            <button
              key={d.key}
              type="button"
              aria-pressed={selected}
              aria-label={`${d.label}: ${d.count} articles in ${d.clusters} clusters`}
              title={`${d.label}: ${d.count} articles, ${d.clusters} clusters`}
              onClick={() => onSelect(selected ? null : d.key)}
              className="group flex h-full max-w-10 flex-1 items-end focus-visible:outline-none"
            >
              <span
                className={`block w-full rounded-t-sm transition-opacity group-focus-visible:ring-2 group-focus-visible:ring-[#e8e4dc] ${
                  TONES[d.level].dot
                } ${selected ? "ring-2 ring-[#e8e4dc]" : ""} ${
                  dimmed ? "opacity-30" : "opacity-90 group-hover:opacity-100"
                }`}
                style={{ height: `${Math.max(6, (d.count / peak) * 100)}%` }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-xs text-[#6b7685]">
        <span>{days[0].label}</span>
        {days.length > 1 && <span>{days[days.length - 1].label}</span>}
      </div>
    </section>
  );
}

function TimelineRow({
  cluster,
  maxCount,
  totalArticles,
  open,
  details,
  loadingDetails,
  onToggle,
}) {
  const tone = TONES[cluster.level];
  const size = Math.round(9 + (cluster.count / maxCount) * 11);
  const share = totalArticles
    ? Math.round((cluster.count / totalArticles) * 100)
    : 0;
  const panelId = `cluster-panel-${cluster.id}`;
  const stories = Array.isArray(details?.articles) ? details.articles : [];

  return (
    <li className="relative border-l border-[#26303c] pb-9 pl-7 last:border-l-transparent">
      {/* node: size = article count, colour = intensity */}
      <span
        aria-hidden="true"
        className={`absolute top-1 rounded-full ring-4 ring-[#10151c] ${tone.dot}`}
        style={{
          width: size,
          height: size,
          left: -0.5 - size / 2,
        }}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[#6b7685]">
            {formatRange(cluster.start, cluster.end)}
          </p>

          <h3
            className={`${serif.className} mt-1 text-xl font-medium leading-snug sm:text-[1.4rem]`}
          >
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-controls={panelId}
              className={`group flex w-full items-start gap-3 rounded text-left hover:text-white ${focusRing}`}
            >
              <span className="flex-1">{cluster.label || "Untitled cluster"}</span>
              <Chevron open={open} />
            </button>
          </h3>

          <p className="mt-2 text-sm text-[#8b95a3]">
            {cluster.count} {cluster.count === 1 ? "article" : "articles"}
          </p>
        </div>

        <Meter level={cluster.level} value={cluster.value} />
      </div>

      {open && (
        <div
          id={panelId}
          className="mt-4 rounded-lg border border-[#26303c] bg-[#171e27] p-5"
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
            <Fact label="First story" value={formatFull(cluster.start)} />
            <Fact label="Latest story" value={formatFull(cluster.end)} />
            <Fact
              label="Duration"
              value={formatDuration(cluster.start, cluster.end)}
            />
            <Fact label="Share of all articles" value={`${share}%`} />
          </dl>

          {/* Loading */}
          {loadingDetails && (
            <div
              role="status"
              className="mt-5 border-t border-[#26303c] pt-5"
            >
              <div className="flex items-center gap-3 text-sm text-[#8b95a3]">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#26303c] border-t-[#f2b134] motion-reduce:animate-none" />
                Loading articles...
              </div>
            </div>
          )}

          {/* Error */}
          {!loadingDetails && details?.error && (
            <div className="mt-5 border-t border-[#26303c] pt-5">
              <p className="text-sm text-[#f08a78]">{details.error}</p>
              <p className="mt-1 text-xs text-[#6b7685]">
                Close and reopen this cluster to try again.
              </p>
            </div>
          )}

          {/* Articles */}
          {!loadingDetails && !details?.error && stories.length > 0 && (
            <div className="mt-5 border-t border-[#26303c] pt-5">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-medium text-[#e8e4dc]">
                  Articles in this cluster
                </h4>

                <span className="text-xs text-[#6b7685]">
                  {stories.length} {stories.length === 1 ? "story" : "stories"}
                </span>
              </div>

              <ul className="space-y-3">
                {stories.map((story, index) => (
                  <li
                    key={story.id ?? index}
                    className="rounded-lg border border-[#26303c] bg-[#10151c] p-4"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {story.source && (
                          <span className="rounded-full bg-[#26303c] px-2.5 py-1 text-[#e8e4dc]">
                            {story.source}
                          </span>
                        )}

                        {story.published_at && (
                          <span className="text-[#6b7685]">
                            {formatFull(toDate(story.published_at))}
                          </span>
                        )}
                      </div>

                      {story.url ? (
                        <a
                          href={story.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`rounded text-base font-medium text-[#e8e4dc] underline decoration-[#26303c] underline-offset-4 transition hover:text-white hover:decoration-[#f2b134] ${focusRing}`}
                        >
                          {story.title || "Untitled article"}
                        </a>
                      ) : (
                        <p className="text-base font-medium text-[#e8e4dc]">
                          {story.title || "Untitled article"}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No articles */}
          {!loadingDetails &&
            !details?.error &&
            details &&
            stories.length === 0 && (
              <div className="mt-5 border-t border-[#26303c] pt-5">
                <p className="text-sm text-[#6b7685]">
                  No articles were returned for this cluster.
                </p>
              </div>
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
    <div className="flex shrink-0 items-center gap-3 text-sm">
      <span className="flex items-end gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`w-1 rounded-sm ${n <= tone.bars ? tone.dot : "bg-[#26303c]"}`}
            style={{ height: 6 + n * 4 }}
          />
        ))}
      </span>
      <span>
        <span className={tone.text}>{tone.label} intensity</span>
        <span className="ml-2 tabular-nums text-[#6b7685]">{shown}</span>
      </span>
    </div>
  );
}

function Summary({ label, value, note, small = false }) {
  return (
    <div>
      <dt className="text-sm text-[#8b95a3]">{label}</dt>
      <dd
        className={`${serif.className} mt-1 font-medium tabular-nums tracking-tight ${
          small ? "text-3xl" : "text-4xl"
        }`}
      >
        {value}
      </dd>
      {note && <dd className="mt-1 text-xs text-[#6b7685]">{note}</dd>}
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-[#6b7685]">{label}</dt>
      <dd className="mt-1 text-[#e8e4dc]">{value}</dd>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading timeline" className="space-y-8">
      {[0, 1, 2, 3].map((n) => (
        <div
          key={n}
          className="ml-1 animate-pulse border-l border-[#26303c] pl-7 motion-reduce:animate-none"
        >
          <div className="h-3 w-32 rounded bg-[#1d2631]" />
          <div className="mt-3 h-6 w-3/4 rounded bg-[#1d2631]" />
          <div className="mt-3 h-3 w-24 rounded bg-[#1d2631]" />
        </div>
      ))}
    </div>
  );
}

function PulseMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    </svg>
  );
}

function RefreshIcon({ spinning }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={spinning ? "animate-spin motion-reduce:animate-none" : ""}
    >
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function Chevron({ open }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`mt-1.5 shrink-0 text-[#6b7685] transition-transform group-hover:text-[#e8e4dc] motion-reduce:transition-none ${
        open ? "rotate-180" : ""
      }`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* ---------- helpers ---------- */

function levelOf(norm) {
  if (norm >= 0.66) return "high";
  if (norm >= 0.33) return "medium";
  return "low";
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

function formatDay(date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatClock(date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFull(date) {
  if (!date) return "Unknown";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRange(start, end) {
  if (!start) return "Time unknown";

  if (!end || end.getTime() === start.getTime()) return formatClock(start);

  if (dayKey(start) === dayKey(end)) {
    return `${formatClock(start)} – ${formatClock(end)}`;
  }

  const short = (d) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return `${short(start)}, ${formatClock(start)} – ${short(end)}, ${formatClock(end)}`;
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