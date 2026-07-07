# Technical Deep-Dive: VeriKick

## Data Layer & Simulation Logic
Since the World Cup 2026 match schedule concludes before the hackathon judging period, VeriKick implements a **Deterministic Match Simulation Engine** (`lib/engine.ts`).

- **Seeded RNG**: Every match state is derived from a `(fixtureId, cycleNumber)` seed using the Mulberry32 algorithm.
- **Pure Functions**: The `getMatchState` and `getFinalResult` functions are pure. Given a specific cycle and fixture, they will always return the same scores, events, and odds.
- **Dynamic Odds**: Odds are computed using a heuristic that factors in team strength (Elo-based), current score differential, and time remaining.

## Merkle Settlement Receipt
This is the core of the **Prediction Markets and Settlement** track. We demonstrate how to settle markets without trusting a central oracle once the data is provided.

1. **Leaf Construction**: Every match statistic (Final Score, Outcome, Total Goals, and individual Goal Events) is hashed using SHA-256 into a "stat leaf".
2. **Tree Building**: Leaves are rolled up into a Merkle Tree.
3. **Receipt Issuance**: The API returns the Merkle Root, a deterministic signature (simulating TxLINE's signature), and the specific inclusion path for the `final_score` leaf.
4. **Client-Side Verification**: The React frontend (`app/portfolio/page.tsx`) uses the Web Crypto API to re-hash the leaf and climb the inclusion path back to the root. If the computed root matches the receipt, the settlement is verified as "Deterministic & Valid".

## API Implementation
- `/api/feed`: Returns a snapshot of all fixtures. It features a **TxLINE Proxy Mode**. If `TXLINE_JWT` and `TXLINE_API_TOKEN` are present, it performs a backend-to-backend fetch to the live TxLINE API, mapping the real data into our dashboard.
- `/api/stream`: A Server-Sent Events (SSE) stream that pushes updates every 5 seconds. This mirrors the real-time websocket/SSE nature of the TxLINE data layer.

## Scalability & Security
- **No Database**: By deriving state from time-based cycles, the app scales horizontally without a stateful DB.
- **Trustless**: The app demonstrates that even if the API provider is malicious, as long as they provide a verifiable proof of the stat (as TxLINE does via `validate_stat`), the client can verify the outcome.
