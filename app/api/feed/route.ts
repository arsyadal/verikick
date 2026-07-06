import { NextResponse } from "next/server";
import { getAllStates } from "@/lib/engine";

export const dynamic = "force-dynamic";

// TxLINE-shaped snapshot of all World Cup fixtures. When TXLINE_JWT and
// TXLINE_API_TOKEN are configured, this proxies the live TxLINE API instead
// of the deterministic simulation.
export async function GET() {
  const jwt = process.env.TXLINE_JWT;
  const apiToken = process.env.TXLINE_API_TOKEN;
  const origin = process.env.TXLINE_API_ORIGIN ?? "https://txline.txodds.com";

  if (jwt && apiToken) {
    try {
      const res = await fetch(`${origin}/api/fixtures`, {
        headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ source: "txline-live", fixtures: data });
      }
    } catch {
      // fall through to simulation
    }
  }

  return NextResponse.json({ source: "txline-sim", fixtures: getAllStates() });
}
