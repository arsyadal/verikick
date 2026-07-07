"use client";

import Link from "next/link";
import { useFeed, StatusBadge, OddsChip } from "@/components/feed";

export default function Dashboard() {
  const { fixtures, connected } = useFeed();
  const live = fixtures.filter((f) => f.status === "live");
  const upcoming = fixtures.filter((f) => f.status === "upcoming").sort((a, b) => a.minute - b.minute);
  const finished = fixtures.filter((f) => f.status === "finished");

  return (
    <div className="space-y-10">
      <section className="rise">
        <h1 className="display text-4xl sm:text-5xl font-extrabold leading-tight board-flicker">
          VERI<span className="text-phosphor">KICK</span> THE ODDS BOARD<span className="text-phosphor">.</span>
        </h1>
        <p className="text-ink-dim mt-2 max-w-2xl text-sm">
          VeriKick is a World Cup prediction market dashboard powered by a TxLINE-shaped feed. Every settled market ships a
          Merkle receipt you can re-verify in the browser — no oracle trust required.
        </p>
        <p className="mt-3 text-xs">
          Feed status:{" "}
          {connected ? (
            <span className="text-phosphor">● connected (SSE)</span>
          ) : (
            <span className="text-amber">○ connecting…</span>
          )}
        </p>
      </section>

      {live.length > 0 && (
        <Section title="LIVE NOW" accent>
          {live.map((f) => (
            <MatchRow key={f.fixtureId} f={f} />
          ))}
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="KICKING OFF SOON">
          {upcoming.map((f) => (
            <MatchRow key={f.fixtureId} f={f} />
          ))}
        </Section>
      )}

      {finished.length > 0 && (
        <Section title="FULL TIME — SETTLEMENT OPEN">
          {finished.map((f) => (
            <MatchRow key={f.fixtureId} f={f} />
          ))}
        </Section>
      )}

      {fixtures.length === 0 && <p className="text-ink-dim">Loading feed…</p>}
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <section className="rise">
      <h2 className={`display font-bold text-sm tracking-[0.25em] mb-3 ${accent ? "text-phosphor" : "text-ink-dim"}`}>
        {title}
      </h2>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function MatchRow({ f }: { f: ReturnType<typeof useFeed>["fixtures"][number] }) {
  return (
    <Link
      href={`/market/${f.fixtureId}`}
      className="group flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-line bg-panel/70 px-4 py-3 hover:border-phosphor-dim transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-ink-dim mb-1">
          <span>Group {f.group}</span>·<StatusBadge f={f} />
        </div>
        <div className="display font-bold text-lg flex items-center gap-3">
          <span>{f.home.name}</span>
          <span className="text-phosphor tabular-nums">
            {f.status === "upcoming" ? "vs" : `${f.homeScore}–${f.awayScore}`}
          </span>
          <span>{f.away.name}</span>
        </div>
        <div className="text-[11px] text-ink-dim truncate">{f.venue}</div>
      </div>
      <div className="flex gap-2 items-center">
        <OddsChip label={f.home.code} value={f.odds.home} />
        <OddsChip label="DRAW" value={f.odds.draw} dim />
        <OddsChip label={f.away.code} value={f.odds.away} />
        <span className="ml-2 text-phosphor opacity-0 group-hover:opacity-100 transition-opacity">→</span>
      </div>
    </Link>
  );
}
