# Submission Form Template

### Project Title
VeriKick

### Briefly explain your Project
VeriKick is a verifiable prediction market for the World Cup that utilizes TxLINE's data layer to enable trustless settlement. The platform features a real-time odds board, dynamic markets for 1X2 and Total Goals, and a settlement engine that generates Merkle receipts for every match outcome. This allows users to verify their prediction results client-side without relying on a centralized oracle.

### TxLINE API Experience: What did you like most, and where did you hit friction?
**Liked most:** The consistent JSON schema across fixtures, odds, and scores made it incredibly easy to build a unified data layer. The inclusion of validation proofs (Merkle primitives) as a first-class citizen in the documentation was the highlight, as it allowed us to model our settlement engine directly on TxLINE's architectural vision for Web3 sports apps.

**Friction:** Since the hackathon occurs before the actual matches, simulating the "proof of result" for testing required building a mock server that strictly followed the TxLINE proof format. It would be great to have a "Mock Proof Generator" in the TxLINE developer toolkit for easier local testing.

### Anything Else?
The project includes a comprehensive "Demo Mode" simulation engine. This ensures that judges can see the full lifecycle of a market—from upcoming to live to settlement—at any time, even if no live World Cup matches are currently active. All settlement receipts generated in this mode are cryptographically valid against the simulated feed.
