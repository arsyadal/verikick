"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFeed } from "@/components/feed";
import { getBalance, getPredictions, savePredictions, setBalance, resetDemo, type Prediction } from "@/lib/store";
import { verifyReceipt, type MerkleReceipt } from "@/lib/proof";

export default function Portfolio() {
  const { fixtures } = useFeed();
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [balance, setBal] = useState(0);
  const [receipts, setReceipts] = useState<Record<string, MerkleReceipt>>({});
  const [verified, setVerified] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPreds(getPredictions());
    setBal(getBalance());
  }, []);

  function settleable(p: Prediction): boolean {
    if (p.status !== "open") return false;
    const f = fixtures.find((x) => x.fixtureId === p.fixtureId);
    if (!f) return false;
    return f.cycle > p.cycle || (f.cycle === p.cycle && f.status === "finished");
  }

  async function settle(p: Prediction) {
    const res = await fetch(`/api/proof/${p.fixtureId}?cycle=${p.cycle}`);
    const { result, receipt } = await res.json();

    const won =
      p.market === "1X2"
        ? result.outcome === p.selection
        : p.selection === "over"
          ? result.totalGoals > 2.5
          : result.totalGoals < 2.5;

    const payout = won ? Math.round(p.stake * p.odds * 100) / 100 : 0;
    const updated = getPredictions().map((x) =>
      x.id === p.id ? { ...x, status: won ? ("won" as const) : ("lost" as const), payout, receiptRoot: receipt.root } : x
    );
    savePredictions(updated);
    if (won) setBalance(getBalance() + payout);
    setPreds(updated);
    setBal(getBalance());
    setReceipts((r) => ({ ...r, [p.id]: receipt }));
  }

  async function verify(p: Prediction) {
    let receipt = receipts[p.id];
    if (!receipt) {
      const res = await fetch(`/api/proof/${p.fixtureId}?cycle=${p.cycle}`);
      receipt = (await res.json()).receipt;
      setReceipts((r) => ({ ...r, [p.id]: receipt }));
    }
    const ok = (await verifyReceipt(receipt)) && (!p.receiptRoot || p.receiptRoot === receipt.root);
    setVerified((v) => ({ ...v, [p.id]: ok }));
  }

  return (
    <div className="space-y-8 rise">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl font-extrabold">PORTFOLIO</h1>
          <p className="text-ink-dim text-sm mt-1">Demo balance and prediction history — settled trustlessly against feed receipts.</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-dim">WALLET BALANCE</div>
          <div className="text-3xl font-bold text-phosphor tabular-nums">{balance.toFixed(2)}</div>
          <div className="text-[11px] text-ink-dim uppercase">USDC (Devnet)</div>
        </div>
      </section>

      {preds.length === 0 ? (
        <p className="text-ink-dim text-sm">
          No predictions yet. Head to the <Link href="/" className="text-phosphor underline">odds board</Link> and pick a market.
        </p>
      ) : (
        <div className="grid gap-3">
          {preds.map((p) => (
            <div key={p.id} className="rounded-lg border border-line bg-panel/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-ink-dim">
                    {p.matchLabel} · {p.market} · window #{p.cycle}
                  </div>
                  <div className="font-semibold">{p.selectionLabel} @ {p.odds.toFixed(2)}</div>
                  <div className="text-xs text-ink-dim tabular-nums">stake {p.stake.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-3">
                  {p.status === "open" &&
                    (settleable(p) ? (
                      <button onClick={() => settle(p)} className="rounded bg-phosphor text-pitch text-sm font-bold px-4 py-2 hover:bg-phosphor/85">
                        SETTLE VIA PROOF
                      </button>
                    ) : (
                      <span className="text-xs text-amber">match in progress</span>
                    ))}
                  {p.status === "won" && (
                    <span className="text-phosphor font-bold tabular-nums">WON +{p.payout?.toFixed(2)}</span>
                  )}
                  {p.status === "lost" && <span className="text-danger font-bold">LOST</span>}
                  {p.status !== "open" && (
                    <button onClick={() => verify(p)} className="rounded border border-phosphor-dim/60 text-xs px-3 py-2 hover:border-phosphor">
                      {verified[p.id] === undefined ? "VERIFY RECEIPT" : verified[p.id] ? "✓ PROOF VALID" : "✗ PROOF INVALID"}
                    </button>
                  )}
                </div>
              </div>

              {receipts[p.id] && <Receipt r={receipts[p.id]} />}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => {
          resetDemo();
          setPreds([]);
          setBal(getBalance());
        }}
        className="text-xs text-ink-dim underline hover:text-danger"
      >
        reset demo wallet
      </button>
    </div>
  );
}

function Receipt({ r }: { r: MerkleReceipt }) {
  return (
    <details className="mt-3 rounded border border-line bg-pitch/60 p-3 text-xs">
      <summary className="cursor-pointer text-phosphor font-semibold">Merkle settlement receipt — {r.statement}</summary>
      <dl className="mt-2 space-y-1 break-all">
        <Row k="merkle root" v={r.root} />
        <Row k="signature" v={r.signature} />
        <Row k="signer" v={r.signer} />
        <Row k="network" v={r.network} />
        <Row k="settled at" v={r.settledAt} />
      </dl>
      <div className="mt-2">
        <div className="text-ink-dim mb-1">stat leaves:</div>
        {r.leaves.map((l, i) => (
          <div key={i} className={i === r.leafIndex ? "text-phosphor" : "text-ink-dim"}>
            {l.label}: {l.value} → {l.hash.slice(0, 16)}…
          </div>
        ))}
      </div>
    </details>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <span className="text-ink-dim">{k}: </span>
      <span className="tabular-nums">{v}</span>
    </div>
  );
}
