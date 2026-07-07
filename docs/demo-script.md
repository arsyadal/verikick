# Demo Video Script (Loom/YouTube)

**Target Time:** 3-5 Minutes

---

## 1. Introduction (0:00 - 0:45)
- "Hi, I'm [Your Name], and this is **VeriKick**, a verifiable prediction market for the World Cup built on the TxLINE data layer."
- **The Problem:** Most sports prediction platforms rely on trusted oracles or centralized APIs for settlement, creating a single point of failure and lack of transparency.
- **The Solution:** VeriKick uses TxLINE's cryptographically verifiable data to settle markets trustlessly using Merkle proofs.

## 2. Dashboard & Live Data (0:45 - 2:00)
- "Here is the Odds Board. We are seeing a live stream of matches powered by a TxLINE-shaped feed."
- *Show the dashboard. Point out the live ticking odds and score updates.*
- "The odds update in real-time using an SSE stream, exactly how a production app would ingest TxLINE's score and price feeds."
- "Let's look at the Argentina vs England match. You can see match events like goals are already being logged."

## 3. Placing a Prediction (2:00 - 3:00)
- "I'll place a prediction on Argentina to win. I'm staking 50 demo-USDC."
- *Click a market, enter stake, and confirm.*
- "The prediction is saved locally to my portfolio. Behind the scenes, we've recorded the fixture ID and the specific match cycle to ensure we settle against the correct time window."

## 4. Settlement & Merkle Verification (3:00 - 4:30)
- "Now let's head to the Portfolio. Here we see our open and finished predictions."
- "For finished matches, we don't just 'trust' the server. We request a **Settlement Receipt**."
- *Click 'SETTLE VIA PROOF'.*
- "When I settle, the app fetches a Merkle proof from the API. My browser then re-verifies this proof using the Web Crypto API."
- *Expand the Merkle receipt details.*
- "You can see the Merkle root, the signature, and the inclusion path. This ensures the match result is exactly what was recorded on the data layer, with no tampering possible."

## 5. Conclusion (4:30 - 5:00)
- "By leveraging TxLINE's verifiable stat primitives, VeriKick removes the need for centralized trust in sports settlement."
- "The code is fully open-source and ready to be connected to TxLINE's mainnet/devnet feed. Thanks for watching!"
