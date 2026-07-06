// Merkle proof layer modelled on TxLINE's scores validation primitive.
// Each settled match produces a receipt: stat leaves are sha256-hashed into a
// merkle tree; the root plus an inclusion path lets anyone re-verify the
// final-score leaf client-side. In demo mode the root is signed with a
// deterministic demo key so receipts are reproducible.

export interface MerkleReceipt {
  fixtureId: string;
  cycle: number;
  statement: string; // human-readable settled stat
  leaves: { label: string; value: string; hash: string }[];
  leafIndex: number; // index of the final-score leaf
  path: { hash: string; position: "left" | "right" }[];
  root: string;
  signature: string;
  signer: string;
  network: string;
  settledAt: string;
}

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function pairHash(a: string, b: string): Promise<string> {
  return sha256Hex(a + b);
}

export interface ResultPayload {
  fixtureId: string;
  cycle: number;
  homeCode: string;
  awayCode: string;
  homeScore: number;
  awayScore: number;
  outcome: string;
  totalGoals: number;
  events: { minute: number; side: string; player: string }[];
}

export async function buildReceipt(r: ResultPayload): Promise<MerkleReceipt> {
  const stats: { label: string; value: string }[] = [
    { label: "fixture_id", value: `${r.fixtureId}#${r.cycle}` },
    { label: "final_score", value: `${r.homeCode} ${r.homeScore}-${r.awayScore} ${r.awayCode}` },
    { label: "outcome", value: r.outcome },
    { label: "total_goals", value: String(r.totalGoals) },
    ...r.events.map((e, i) => ({
      label: `goal_${i + 1}`,
      value: `${e.minute}' ${e.side} ${e.player}`,
    })),
  ];

  const leaves = await Promise.all(
    stats.map(async (s) => ({ ...s, hash: await sha256Hex(`${s.label}:${s.value}`) }))
  );

  // build tree, recording the inclusion path for the final_score leaf (index 1)
  const leafIndex = 1;
  let level = leaves.map((l) => l.hash);
  let idx = leafIndex;
  const path: { hash: string; position: "left" | "right" }[] = [];

  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? level[i];
      next.push(await pairHash(left, right));
      if (i === idx || i + 1 === idx) {
        if (i === idx) path.push({ hash: right, position: "right" });
        else path.push({ hash: left, position: "left" });
        idx = next.length - 1;
      }
    }
    level = next;
  }

  const root = level[0];
  const signature = await sha256Hex(`txline-demo-signer:${root}`);

  return {
    fixtureId: r.fixtureId,
    cycle: r.cycle,
    statement: `${r.homeCode} ${r.homeScore}-${r.awayScore} ${r.awayCode}`,
    leaves,
    leafIndex,
    path,
    root,
    signature,
    signer: "TxLINE-DEMO (simulated feed signer)",
    network: "solana-devnet (simulated)",
    settledAt: new Date().toISOString(),
  };
}

// Client-side re-verification: recompute the root from the leaf + path.
export async function verifyReceipt(receipt: MerkleReceipt): Promise<boolean> {
  const leaf = receipt.leaves[receipt.leafIndex];
  let hash = await sha256Hex(`${leaf.label}:${leaf.value}`);
  if (hash !== leaf.hash) return false;
  for (const step of receipt.path) {
    hash = step.position === "right" ? await pairHash(hash, step.hash) : await pairHash(step.hash, hash);
  }
  return hash === receipt.root;
}
