# VeriKick ⚽️

**Verifiable World Cup prediction markets with Merkle-proof settlement — built for the TxODDS World Cup Hackathon (Prediction Markets and Settlement track).**

VeriKick is a live odds board and prediction market for the 2026 World Cup. Markets stream from a TxLINE-shaped data feed, and every settled prediction ships a **Merkle settlement receipt** that anyone can re-verify in their browser — the exact trust model TxLINE's on-chain validation primitives enable, demonstrated end to end.

> ⚠️ Demo build: all balances are simulated (`demo-USDC`). No real-money wagering.

## Features

- **Live odds board** — 12 World Cup fixtures streaming over Server-Sent Events, mirroring TxLINE's SSE stream. Scores, goal events, and 1X2 / Over-Under odds update in real time.
- **Prediction markets** — Match Winner (1X2) and Total Goals (O/U 2.5) markets with live implied probabilities. Odds shift dynamically with match state (score, time remaining, team strength).
- **Deterministic settlement** — when a match finishes, open predictions are settled against the final result. Resolution logic is pure and deterministic: same inputs, same outcome, every time.
- **Merkle settlement receipts** — each settlement produces a receipt modelled on TxLINE's scores-validation primitive: every match stat becomes a SHA-256 leaf, leaves roll up into a Merkle root, and the receipt carries the inclusion path for the final-score leaf. The **VERIFY RECEIPT** button recomputes the root client-side — no server trust required.
- **Always-on demo mode** — matches run in rolling simulated windows, so judges always see live, in-play, and settled markets regardless of the real tournament schedule (World Cup matches end before judging begins).

## Architecture

```
┌────────────┐  SSE (5s ticks)  ┌──────────────────┐
│  Dashboard  │◄────────────────│ /api/stream       │
│  Market     │  REST snapshot  │ /api/feed         │──► TxLINE live API
│  Portfolio  │◄────────────────│ /api/proof/[id]   │    (when creds set)
└─────┬──────┘                  └────────┬─────────┘
      │ localStorage                      │
      │ (demo wallet + predictions)       ▼
      │                          lib/engine.ts  — deterministic match sim
      └── lib/proof.ts ─────────  lib/proof.ts   — Merkle receipt builder
          (client re-verification)
```

- `lib/engine.ts` — deterministic simulation engine. Every match state derives from `(fixtureId, cycle)` seeds, so all server instances and clients compute identical scores, events, and odds with zero database.
- `lib/proof.ts` — Merkle receipt builder + client-side verifier (Web Crypto SHA-256).
- `app/api/feed` — TxLINE-shaped fixture snapshot. When `TXLINE_JWT` + `TXLINE_API_TOKEN` env vars are set, it proxies the live TxLINE API (`Authorization: Bearer` + `X-Api-Token` headers per the TxLINE quickstart); otherwise it serves the simulation and labels it `txline-sim`.
- `app/api/stream` — SSE endpoint mirroring TxLINE's score/odds stream.
- `app/api/proof/[id]` — settlement receipt endpoint, modelled on TxLINE's validation-proof endpoints.

## TxLINE integration

| This app | TxLINE equivalent |
|---|---|
| `/api/feed` fixture snapshot | Fixtures endpoints |
| `/api/stream` SSE ticks | Score/odds event stream |
| `/api/proof/[id]` Merkle receipt | Validation proofs (`validate_stat` primitive) |
| Client-side root recomputation | Trustless on-chain verification via CPI |

The settlement flow maps 1:1 onto an on-chain design: replace the demo signer with TxLINE's feed signature, and the `SETTLE VIA PROOF` action becomes a Solana instruction that CPIs into TxLINE's `validate_stat` to release escrowed funds.

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Optional — point at the live TxLINE API (requires an activated free-tier World Cup token, see [TxLINE World Cup docs](https://txline.txodds.com/documentation/worldcup)):

```bash
TXLINE_JWT=... TXLINE_API_TOKEN=... npm run dev
```

## Docs

- [Technical documentation](docs/technical.md)
- [Demo video script](docs/demo-script.md)
- [Submission form answers](docs/submission.md)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Web Crypto API · deployed on Vercel.
