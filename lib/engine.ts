// Deterministic World Cup match simulation engine.
// Produces TxLINE-shaped fixtures, live scores, events and odds without a
// backing database: everything is derived from (fixtureId, cycle) seeds, so
// every server instance and every client computes identical state.

export type MatchStatus = "upcoming" | "live" | "finished";

export interface Team {
  code: string;
  name: string;
  strength: number; // 0..1
}

export interface GoalEvent {
  minute: number;
  side: "home" | "away";
  player: string;
}

export interface OddsTriple {
  home: number;
  draw: number;
  away: number;
}

export interface MatchState {
  fixtureId: string;
  cycle: number;
  group: string;
  venue: string;
  home: Team;
  away: Team;
  status: MatchStatus;
  minute: number; // live minute, or minutes-to-kickoff when upcoming
  homeScore: number;
  awayScore: number;
  events: GoalEvent[];
  odds: OddsTriple; // decimal odds, 1X2
  overOdds: number; // total goals over 2.5
  underOdds: number;
  kickoffAt: number; // epoch ms
  source: "txline-sim";
}

const TEAMS: Team[] = [
  { code: "BRA", name: "Brazil", strength: 0.92 },
  { code: "FRA", name: "France", strength: 0.9 },
  { code: "ARG", name: "Argentina", strength: 0.91 },
  { code: "ENG", name: "England", strength: 0.86 },
  { code: "ESP", name: "Spain", strength: 0.88 },
  { code: "GER", name: "Germany", strength: 0.84 },
  { code: "POR", name: "Portugal", strength: 0.85 },
  { code: "NED", name: "Netherlands", strength: 0.83 },
  { code: "BEL", name: "Belgium", strength: 0.8 },
  { code: "CRO", name: "Croatia", strength: 0.78 },
  { code: "URU", name: "Uruguay", strength: 0.77 },
  { code: "COL", name: "Colombia", strength: 0.76 },
  { code: "MEX", name: "Mexico", strength: 0.72 },
  { code: "USA", name: "United States", strength: 0.73 },
  { code: "JPN", name: "Japan", strength: 0.74 },
  { code: "KOR", name: "South Korea", strength: 0.7 },
  { code: "MAR", name: "Morocco", strength: 0.79 },
  { code: "SEN", name: "Senegal", strength: 0.71 },
  { code: "GHA", name: "Ghana", strength: 0.66 },
  { code: "AUS", name: "Australia", strength: 0.65 },
  { code: "CAN", name: "Canada", strength: 0.68 },
  { code: "SUI", name: "Switzerland", strength: 0.75 },
  { code: "DEN", name: "Denmark", strength: 0.74 },
  { code: "IDN", name: "Indonesia", strength: 0.6 },
];

const VENUES = [
  "MetLife Stadium, New York",
  "SoFi Stadium, Los Angeles",
  "Estadio Azteca, Mexico City",
  "BC Place, Vancouver",
  "AT&T Stadium, Dallas",
  "Hard Rock Stadium, Miami",
  "Mercedes-Benz Stadium, Atlanta",
  "Lumen Field, Seattle",
  "Gillette Stadium, Boston",
  "BMO Field, Toronto",
  "Levi's Stadium, San Francisco",
  "NRG Stadium, Houston",
];

export interface FixtureDef {
  id: string;
  home: Team;
  away: Team;
  group: string;
  venue: string;
  offset: number; // minutes, staggers fixtures across the cycle
}

export const FIXTURES: FixtureDef[] = Array.from({ length: 12 }, (_, i) => ({
  id: `wc26-${String(i + 1).padStart(3, "0")}`,
  home: TEAMS[i * 2],
  away: TEAMS[i * 2 + 1],
  group: String.fromCharCode(65 + (i % 12)),
  venue: VENUES[i % VENUES.length],
  offset: i * 19,
}));

const CYCLE = 240; // minutes per simulated match window
const PRE = 45; // pre-kickoff window inside the cycle

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = ["Silva", "Martinez", "Kane", "Yamal", "Mbappe", "Vinicius", "Musiala", "Gakpo", "Diaz", "Pulisic", "Kubo", "Hakimi", "Osman", "Ferreira", "Alvarez", "Olmo"];

function fullTimeGoals(rand: () => number, strength: number): GoalEvent[] {
  const events: GoalEvent[] = [];
  // simple Poisson-ish draw, expected goals scale with team strength
  const lambda = 0.6 + strength * 1.6;
  let n = 0;
  let p = Math.exp(-lambda);
  let cum = p;
  const u = rand();
  while (u > cum && n < 6) {
    n++;
    p = (p * lambda) / n;
    cum += p;
  }
  for (let g = 0; g < n; g++) {
    events.push({
      minute: 1 + Math.floor(rand() * 90),
      side: "home", // corrected by caller
      player: FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)],
    });
  }
  return events;
}

function clamp(x: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, x));
}

function toDecimal(p: number): number {
  const margin = 1.06;
  return Math.round((1 / clamp(p * margin, 0.015, 0.97)) * 100) / 100;
}

export function getMatchState(fixture: FixtureDef, nowMs: number = Date.now()): MatchState {
  const nowMin = Math.floor(nowMs / 60000);
  const local = (nowMin + fixture.offset) % CYCLE;
  const cycle = Math.floor((nowMin + fixture.offset) / CYCLE);
  const minute = local - PRE;

  const seed = fnv1a(`${fixture.id}:${cycle}`);
  const rand = mulberry32(seed);

  // full-time script for this cycle, fixed by seed
  const homeGoals = fullTimeGoals(rand, fixture.home.strength).map((e) => ({ ...e, side: "home" as const }));
  const awayGoals = fullTimeGoals(rand, fixture.away.strength * 0.9).map((e) => ({ ...e, side: "away" as const }));
  const script = [...homeGoals, ...awayGoals].sort((a, b) => a.minute - b.minute);

  let status: MatchStatus;
  let liveMinute: number;
  if (minute < 0) {
    status = "upcoming";
    liveMinute = -minute; // minutes to kickoff
  } else if (minute <= 92) {
    status = "live";
    liveMinute = Math.min(minute, 90);
  } else {
    status = "finished";
    liveMinute = 90;
  }

  const visible = status === "upcoming" ? [] : script.filter((e) => e.minute <= liveMinute);
  const homeScore = visible.filter((e) => e.side === "home").length;
  const awayScore = visible.filter((e) => e.side === "away").length;

  // 1X2 probabilities: pre-match from strengths, live tilted by score + time left
  const edge = fixture.home.strength - fixture.away.strength + 0.08; // home advantage
  const timeLeft = status === "finished" ? 0 : status === "upcoming" ? 1 : (90 - liveMinute) / 90;
  const diff = homeScore - awayScore;
  const z = 1.15 * diff + 2.4 * edge * timeLeft + 1.15 * diff * (1 - timeLeft) * 2;
  const pHomeRaw = 1 / (1 + Math.exp(-z));
  const pDraw = clamp(0.3 * timeLeft + (diff === 0 ? 0.28 * (1 - timeLeft) : 0.02), 0.02, 0.4);
  const pHome = pHomeRaw * (1 - pDraw);
  const pAway = (1 - pHomeRaw) * (1 - pDraw);

  const total = homeScore + awayScore;
  const expRemaining = 2.4 * timeLeft;
  const pOver = total >= 3 ? 0.99 : clamp((total + expRemaining - 1.9) / 2.2, 0.02, 0.97);

  const kickoffAt = (nowMin - minute) * 60000;

  return {
    fixtureId: fixture.id,
    cycle,
    group: fixture.group,
    venue: fixture.venue,
    home: fixture.home,
    away: fixture.away,
    status,
    minute: liveMinute,
    homeScore,
    awayScore,
    events: visible,
    odds: { home: toDecimal(pHome), draw: toDecimal(pDraw), away: toDecimal(pAway) },
    overOdds: toDecimal(pOver),
    underOdds: toDecimal(1 - pOver),
    kickoffAt,
    source: "txline-sim",
  };
}

// Final result for a given fixture+cycle, regardless of current wall clock.
// Used for deterministic settlement of past predictions.
export function getFinalResult(fixtureId: string, cycle: number) {
  const fixture = FIXTURES.find((f) => f.id === fixtureId);
  if (!fixture) return null;
  const seed = fnv1a(`${fixtureId}:${cycle}`);
  const rand = mulberry32(seed);
  const homeGoals = fullTimeGoals(rand, fixture.home.strength).map((e) => ({ ...e, side: "home" as const }));
  const awayGoals = fullTimeGoals(rand, fixture.away.strength * 0.9).map((e) => ({ ...e, side: "away" as const }));
  const events = [...homeGoals, ...awayGoals].sort((a, b) => a.minute - b.minute);
  const homeScore = homeGoals.length;
  const awayScore = awayGoals.length;
  return {
    fixtureId,
    cycle,
    home: fixture.home,
    away: fixture.away,
    homeScore,
    awayScore,
    events,
    outcome: homeScore > awayScore ? "home" : homeScore < awayScore ? "away" : "draw",
    totalGoals: homeScore + awayScore,
  };
}

export function getAllStates(nowMs: number = Date.now()): MatchState[] {
  return FIXTURES.map((f) => getMatchState(f, nowMs));
}
