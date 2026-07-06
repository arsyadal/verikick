import { getAllStates } from "@/lib/engine";

export const dynamic = "force-dynamic";

// SSE stream mirroring TxLINE's score/odds event stream: pushes a full
// snapshot every 5 seconds so the dashboard ticks live.
export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const push = () => {
        const payload = JSON.stringify({ source: "txline-sim", ts: Date.now(), fixtures: getAllStates() });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };
      push();
      const interval = setInterval(push, 5000);
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
