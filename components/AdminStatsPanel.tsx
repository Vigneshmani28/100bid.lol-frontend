"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, ApiRequestError } from "@/lib/api";
import type { DatafastStats } from "@/lib/types";
import { formatCentsAsUsd } from "@/lib/money";

const TOKEN_STORAGE_KEY = "100bid_admin_token";

const RANGE_PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
] as const;

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeForDays(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { startAt: toDateString(start), endAt: toDateString(end) };
}

/**
 * DataFast revenue attribution + traffic stats, pulled through our own
 * /api/admin/datafast/stats proxy (the df_ API key never reaches the
 * browser). There's no session/role system elsewhere in this app, so this
 * page gates itself with a single shared secret entered by hand — see
 * backend/src/middleware/adminAuth.ts for the server-side half.
 */
export function AdminStatsPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<DatafastStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reading localStorage is exactly the "subscribe to an external system"
  // case effects exist for, and has to happen after mount: doing it in a
  // lazy useState initializer would render different markup on the server
  // (no localStorage) than on the client, which is a hydration mismatch.
  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
      setToken(stored);
    }
  }, []);

  const load = useCallback((activeToken: string, activeDays: number) => {
    setLoading(true);
    setError(null);
    api
      .getDatafastStats(activeToken, rangeForDays(activeDays))
      .then((data) => setStats(data))
      .catch((err) => {
        if (err instanceof ApiRequestError && err.code === "ADMIN_UNAUTHORIZED") {
          setError("That admin token was rejected. Check it and try again.");
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
        } else if (err instanceof ApiRequestError) {
          setError(err.message);
        } else {
          setError("Something went wrong loading stats.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Re-fetches whenever the token or selected range changes, so `load`
  // synchronously resets loading/error state before kicking off the
  // request — unlike a mount-only fetch, this genuinely needs to happen on
  // every dependency change, not just once.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    if (token) load(token, days);
  }, [token, days, load]);

  function handleTokenSubmit() {
    const trimmed = tokenInput.trim();
    if (!trimmed) return;
    window.localStorage.setItem(TOKEN_STORAGE_KEY, trimmed);
    setToken(trimmed);
  }

  if (!token) {
    return (
      <section className="mx-auto max-w-md px-4 py-14 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Admin stats
        </h1>
        <p className="mt-1 text-sm text-muted">
          Enter the admin token to view DataFast traffic and revenue stats.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTokenSubmit()}
            placeholder="Admin token"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus-visible:outline-none"
          />
          <Button onClick={handleTokenSubmit} disabled={!tokenInput.trim()}>
            Continue
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Admin stats
          </h1>
          <p className="mt-1 text-sm text-muted">
            Traffic and revenue attribution, from DataFast.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            window.localStorage.removeItem(TOKEN_STORAGE_KEY);
            setToken(null);
            setStats(null);
          }}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          Sign out
        </button>
      </div>

      <div className="mt-6 flex gap-2">
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset.days}
            type="button"
            onClick={() => setDays(preset.days)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              days === preset.days
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {loading && (
        <div role="status" aria-live="polite" className="mt-6 space-y-3">
          <div className="h-24 animate-pulse rounded-lg border border-border bg-surface" />
          <div className="h-48 animate-pulse rounded-lg border border-border bg-surface" />
          <span className="sr-only">Loading stats…</span>
        </div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-lg border border-danger/40 bg-surface p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {!loading && !error && stats && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Visitors" value={stats.overview.visitors.toLocaleString()} />
            <StatCard label="Pageviews" value={stats.overview.pageviews.toLocaleString()} />
            <StatCard label="Sessions" value={stats.overview.sessions.toLocaleString()} />
            <StatCard label="Payments" value={stats.overview.payments.toLocaleString()} />
            <StatCard label="Revenue" value={formatCentsAsUsd(stats.overview.revenue)} />
          </div>

          <div className="rounded-xl border border-border-strong bg-surface p-4">
            <h2 className="text-sm font-semibold text-foreground">
              Daily breakdown ({stats.range.startAt} – {stats.range.endAt})
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Visitors</th>
                    <th className="py-2 pr-3 font-medium">Sessions</th>
                    <th className="py-2 pr-3 font-medium">Payments</th>
                    <th className="py-2 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.timeseries.map((point) => (
                    <tr key={point.date} className="border-b border-border/50 text-foreground">
                      <td className="py-2 pr-3">{point.date}</td>
                      <td className="py-2 pr-3">{point.visitors.toLocaleString()}</td>
                      <td className="py-2 pr-3">{point.sessions.toLocaleString()}</td>
                      <td className="py-2 pr-3">{point.payments.toLocaleString()}</td>
                      <td className="py-2">{formatCentsAsUsd(point.revenue)}</td>
                    </tr>
                  ))}
                  {stats.timeseries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-muted">
                        No data for this range yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
