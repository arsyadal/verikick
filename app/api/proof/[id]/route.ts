import { NextResponse } from "next/server";
import { getFinalResult } from "@/lib/engine";
import { buildReceipt } from "@/lib/proof";

export const dynamic = "force-dynamic";

// Merkle settlement receipt for a finished fixture cycle, modelled on
// TxLINE's validation-proof endpoints. ?cycle=N pins a specific match window.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const cycle = Number(url.searchParams.get("cycle"));
  if (!Number.isFinite(cycle)) {
    return NextResponse.json({ error: "cycle query param required" }, { status: 400 });
  }

  const result = getFinalResult(id, cycle);
  if (!result) {
    return NextResponse.json({ error: "unknown fixture" }, { status: 404 });
  }

  const receipt = await buildReceipt({
    fixtureId: result.fixtureId,
    cycle: result.cycle,
    homeCode: result.home.code,
    awayCode: result.away.code,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    outcome: result.outcome,
    totalGoals: result.totalGoals,
    events: result.events,
  });

  return NextResponse.json({ result: { outcome: result.outcome, totalGoals: result.totalGoals, homeScore: result.homeScore, awayScore: result.awayScore }, receipt });
}
