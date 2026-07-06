"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useFeed, StatusBadge } from "@/components/feed";
import { placePrediction, getBalance, type Selection } from "@/lib/store";

export default function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { fixtures } = useFeed();
  const f = fixtures.find((x) => x.fixtureId === id);
  const [stake, setStake] = useState(25);
  const [picked, setPicked] = useState<{ sel: Selection; label: string; odds: number } | null>(null);
  const [placed, setPlaced] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => {
    if (!f) return [];
    return [
      { market: "1X2" as const, sel: "home" as const, label: `${f.home.name} win`, odds: f.odds.home },
      { market: "1X2" as const, sel: "draw" as const, label: "Draw", odds: f.odds.draw },
      { market: "1X2" as const, sel: "away" as const, label: `${f.away.name} win`, odds: f.odds.away },
      { market: "OU2.5" as const, sel: "over" as const, label: "Over 2.5 goals", odds: f.overOdds },
      { market: "OU2.5" as const, sel: "under" as const, label: "Under 2.5 goals", odds: f.underOdds },
    ];
  }, [f]);

  if (!f) return <p className="text-ink-dim">Loading market…</p>;

  const closed = f.status === "finished";

  function submit() {
    if (!f || !picked) return;
    setError(null);
    const opt = options.find((o) => o.sel === picked.sel)!;
    const p = placePrediction({
      fixtureId: f.fixtureId,
      cycle: f.cycle,
      matchLabel: `${f.home.code} vs ${f.away.code}`,
      market: opt.market,
      selection: opt.sel,
      selectionLabel: opt.label,
      odds: opt.odds,
      stake,
    });
    if (!p) {
      setError(`Stake must be between 0 and your balance (${getBalance().toFixed(2)} demo-USDC).`);
      return;
    }
    setPlaced(p.id);
  }

  return (
    <div className="space-y-8 rise">
      <Link href="/" className="text-xs text-ink-dim hover:text-phosphor">← back to board</Link>

      <section className="rounded-xl border border-line bg-panel/70 p-6">
        <div className="flex items-center gap-2 text-xs text-ink-dim mb-2">
          <span>Group {f.group}</span>·<StatusBadge f={f} />·<span>{f.venue}</span>
        </div>
        <h1 className="display text-3xl sm:text-4xl font-extrabold">
          {f.home.name} <span className="text-phosphor tabular-nums">{f.status === "upcoming" ? "vs" : `${f.homeScore}–${f.awayScore}`}</span> {f.away.name}
        </h1>
        {f.events.length > 0 && (
          <ul className="mt-3 text-xs text-ink-dim space-y-0.5">
            {f.events.map((e, i) => (
              <li key={i}>
                <span className="text-phosphor tabular-nums">{e.minute}&apos;</span> ⚽ {e.player} ({e.side === "home" ? f.home.code : f.away.code})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="display font-bold text-sm tracking-[0.25em] text-ink-dim mb-3">
          {closed ? "MARKETS CLOSED — AWAITING SETTLEMENT" : "OPEN MARKETS"}
        </h2>
        <div className="grid sm:grid-cols-3 gap-2">
          {options.map((o) => {
            const implied = ((1 / o.odds) * 100).toFixed(1);
            const active = picked?.sel === o.sel;
            return (
              <button
                key={o.sel}
                disabled={closed}
                onClick={() => setPicked({ sel: o.sel, label: o.label, odds: o.odds })}
                className={`rounded-lg border p-4 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  active ? "border-phosphor bg-phosphor/10" : "border-line bg-panel/70 hover:border-phosphor-dim"
                }`}
              >
                <div className="text-xs text-ink-dim">{o.market}</div>
                <div className="font-semibold">{o.label}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-phosphor tabular-nums">{o.odds.toFixed(2)}</span>
                  <span className="text-[11px] text-ink-dim">{implied}% implied</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {!closed && (
        <section className="rounded-xl border border-line bg-panel/70 p-6 max-w-md">
          <h3 className="display font-bold mb-3">Place prediction</h3>
          <label className="block text-xs text-ink-dim mb-1">Stake (demo-USDC)</label>
          <input
            type="number"
            min={1}
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            className="w-full rounded border border-line bg-pitch px-3 py-2 tabular-nums focus:border-phosphor outline-none"
          />
          {picked && (
            <p className="text-xs text-ink-dim mt-2">
              {picked.label} @ {picked.odds.toFixed(2)} → potential payout{" "}
              <span className="text-phosphor font-semibold">{(stake * picked.odds).toFixed(2)}</span>
            </p>
          )}
          {error && <p className="text-xs text-danger mt-2">{error}</p>}
          {placed ? (
            <p className="text-sm text-phosphor mt-4">
              ✓ Prediction placed. Track it in your <Link href="/portfolio" className="underline">portfolio</Link>.
            </p>
          ) : (
            <button
              onClick={submit}
              disabled={!picked}
              className="mt-4 w-full rounded bg-phosphor text-pitch font-bold py-2 hover:bg-phosphor/85 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {picked ? `CONFIRM — ${picked.label}` : "PICK A MARKET"}
            </button>
          )}
        </section>
      )}

      {closed && (
        <p className="text-sm text-ink-dim">
          This match window is settled. Open predictions on it can be resolved from your{" "}
          <Link href="/portfolio" className="text-phosphor underline">portfolio</Link>, where the Merkle
          settlement receipt is generated and verified.
        </p>
      )}
    </div>
  );
}
