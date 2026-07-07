"use client";

import { useEffect, useRef, useState } from "react";
import type { MatchState } from "@/lib/engine";

export function useFeed() {
  const [fixtures, setFixtures] = useState<MatchState[]>([]);
  const [connected, setConnected] = useState(false);
  const prevOdds = useRef<Record<string, number>>({});
  const [drift, setDrift] = useState<Record<string, "up" | "down">>({});

  useEffect(() => {
    // Initial fetch so we don't wait 5s for the first tick
    fetch("/api/feed")
      .then((res) => res.json())
      .then((data) => {
        setFixtures(data.fixtures);
        setConnected(true);
      });

    const es = new EventSource("/api/stream");
    es.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      const next: MatchState[] = data.fixtures;
      const d: Record<string, "up" | "down"> = {};
      for (const f of next) {
        const prev = prevOdds.current[f.fixtureId];
        if (prev !== undefined && prev !== f.odds.home) {
          d[f.fixtureId] = f.odds.home > prev ? "up" : "down";
        }
        prevOdds.current[f.fixtureId] = f.odds.home;
      }
      setDrift(d);
      setFixtures(next);
      setConnected(true);
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  return { fixtures, connected, drift };
}

export function StatusBadge({ f }: { f: MatchState }) {
  if (f.status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 text-phosphor text-xs font-semibold">
        <span className="live-dot inline-block w-1.5 h-1.5 rounded-full bg-phosphor" />
        LIVE {f.minute}&apos;
      </span>
    );
  }
  if (f.status === "upcoming") {
    return <span className="text-amber text-xs">KO in {f.minute}m</span>;
  }
  return <span className="text-ink-dim text-xs">FT</span>;
}

export function OddsChip({ label, value, dim }: { label: string; value: number; dim?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded border px-2 py-1 min-w-14 ${dim ? "border-line text-ink-dim" : "border-phosphor-dim/50"}`}>
      <span className="text-[10px] text-ink-dim">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value.toFixed(2)}</span>
    </div>
  );
}
