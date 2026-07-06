// Client-side portfolio store (localStorage). Demo balances only — no real
// funds move anywhere in this MVP.

export type Selection = "home" | "draw" | "away" | "over" | "under";

export interface Prediction {
  id: string;
  fixtureId: string;
  cycle: number;
  matchLabel: string;
  market: "1X2" | "OU2.5";
  selection: Selection;
  selectionLabel: string;
  odds: number;
  stake: number;
  placedAt: string;
  status: "open" | "won" | "lost";
  payout?: number;
  receiptRoot?: string;
}

const BAL_KEY = "pmwc_balance";
const PRED_KEY = "pmwc_predictions";
export const STARTING_BALANCE = 1000;

export function getBalance(): number {
  const raw = localStorage.getItem(BAL_KEY);
  return raw === null ? STARTING_BALANCE : Number(raw);
}

export function setBalance(v: number) {
  localStorage.setItem(BAL_KEY, String(Math.round(v * 100) / 100));
}

export function getPredictions(): Prediction[] {
  try {
    return JSON.parse(localStorage.getItem(PRED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function savePredictions(preds: Prediction[]) {
  localStorage.setItem(PRED_KEY, JSON.stringify(preds));
}

export function placePrediction(p: Omit<Prediction, "id" | "placedAt" | "status">): Prediction | null {
  const balance = getBalance();
  if (p.stake <= 0 || p.stake > balance) return null;
  const pred: Prediction = {
    ...p,
    id: `${p.fixtureId}-${p.cycle}-${p.selection}-${Date.now()}`,
    placedAt: new Date().toISOString(),
    status: "open",
  };
  savePredictions([pred, ...getPredictions()]);
  setBalance(balance - p.stake);
  return pred;
}

export function resetDemo() {
  localStorage.removeItem(BAL_KEY);
  localStorage.removeItem(PRED_KEY);
}
