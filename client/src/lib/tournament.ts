// =============================================================================
// CARROM TOURNAMENT — Core Logic & Data Models
// Design: Dark Luxury Sports (IPL Trophy Night)
// Colors: #111111 bg, #1C1C1C surface, #DC2626 accent red, #EFEFEF text
// =============================================================================

export type MatchResult = "player1_win" | "player2_win" | "draw" | null;

export interface Player {
  id: string;
  name: string;
  /** Data URL or other image URL chosen at setup; persisted with tournament state. */
  avatarUrl?: string;
}

/** Player row when starting a tournament (from setup). */
export type PlayerSeed = { name: string; avatarUrl?: string };

export interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  result: MatchResult;
  stage: "league" | "tiebreaker" | "qualifier1" | "eliminator" | "qualifier2" | "final";
  round?: number; // for tiebreaker rounds
}

export interface StandingEntry {
  playerId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  rank: number;
}

export type TournamentStage =
  | "setup"
  | "league"
  | "tiebreaker"
  | "knockout"
  | "complete";

export interface KnockoutState {
  qualifier1?: Match;       // Top1 vs Top2
  eliminator?: Match;       // Top3 vs Top4
  qualifier2?: Match;       // Winner(Elim) vs Loser(Q1)
  final?: Match;            // Winner(Q1) vs Winner(Q2)
  champion?: string;        // playerId of champion
}

export interface TiebreakerGroup {
  position: number; // the rank position being contested (e.g., 4 means fighting for 4th)
  playerIds: string[];
  matches: Match[];
  resolved: boolean;
  winnerId?: string;
}

export interface TournamentState {
  players: Player[];
  leagueMatches: Match[];
  tiebreakerGroups: TiebreakerGroup[];
  knockoutState: KnockoutState;
  stage: TournamentStage;
  top4: string[]; // playerIds in order [1st, 2nd, 3rd, 4th]
  currentMatchIndex: number; // index into leagueMatches for "current game" view
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Fisher-Yates shuffle */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Generate all round-robin pairs for a list of player IDs */
export function generateRoundRobin(playerIds: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      pairs.push([playerIds[i], playerIds[j]]);
    }
  }
  return shuffle(pairs);
}

/** Compute standings from a list of matches */
export function computeStandings(
  players: Player[],
  matches: Match[]
): StandingEntry[] {
  const map: Record<string, StandingEntry> = {};
  for (const p of players) {
    map[p.id] = { playerId: p.id, played: 0, won: 0, drawn: 0, lost: 0, points: 0, rank: 0 };
  }

  for (const m of matches) {
    if (!m.result) continue;
    const e1 = map[m.player1Id];
    const e2 = map[m.player2Id];
    if (!e1 || !e2) continue;

    e1.played++;
    e2.played++;

    if (m.result === "player1_win") {
      e1.won++; e1.points += 2;
      e2.lost++;
    } else if (m.result === "player2_win") {
      e2.won++; e2.points += 2;
      e1.lost++;
    } else if (m.result === "draw") {
      e1.drawn++; e1.points += 1;
      e2.drawn++; e2.points += 1;
    }
  }

  const sorted = Object.values(map).sort((a, b) => b.points - a.points || b.won - a.won);
  sorted.forEach((e, i) => (e.rank = i + 1));
  return sorted;
}

/** Group players by points to find ties at the boundary positions */
export function findTiebreakerGroups(
  standings: StandingEntry[],
  requiredPositions: number[] // e.g. [4] means we need to resolve who is exactly 4th
): TiebreakerGroup[] {
  const groups: TiebreakerGroup[] = [];

  for (const pos of requiredPositions) {
    // pos is 1-indexed rank — we need to check if position `pos` is ambiguous
    if (standings.length <= pos) continue; // not enough players to have a boundary

    const entryAtPos = standings[pos - 1]; // last qualifying position (0-indexed)
    const entryJustOut = standings[pos];   // first non-qualifying position (0-indexed)

    if (!entryAtPos || !entryJustOut) continue;

    // If the player just inside and just outside have the same points, there's a tie
    if (entryAtPos.points !== entryJustOut.points) continue;

    const boundaryPoints = entryAtPos.points;

    // Collect all players with this points value
    const tiedPlayers = standings.filter((e) => e.points === boundaryPoints);
    if (tiedPlayers.length <= 1) continue;

    // How many spots are available for this points group?
    const firstTiedRank = standings.findIndex((e) => e.points === boundaryPoints); // 0-indexed
    const spotsAvailable = pos - firstTiedRank; // how many of the tied group fit in top-N

    if (spotsAvailable >= tiedPlayers.length) continue; // everyone fits, no tiebreaker needed
    if (spotsAvailable <= 0) continue; // none fit, no tiebreaker needed

    groups.push({
      position: pos,
      playerIds: tiedPlayers.map((e) => e.playerId),
      matches: [],
      resolved: false,
    });
  }

  return groups;
}

/** Check if all league matches are complete */
export function isLeagueComplete(matches: Match[]): boolean {
  return matches.every((m) => m.result !== null);
}

/** Check if a tiebreaker group is resolved */
export function isTiebreakerGroupResolved(group: TiebreakerGroup): boolean {
  return group.matches.every((m) => m.result !== null);
}

/** Generate tiebreaker matches for a group (round-robin among tied players) */
export function generateTiebreakerMatches(group: TiebreakerGroup): Match[] {
  const pairs = generateRoundRobin(group.playerIds);
  return pairs.map(([p1, p2]) => ({
    id: generateId(),
    player1Id: p1,
    player2Id: p2,
    result: null,
    stage: "tiebreaker" as const,
  }));
}

/** Resolve tiebreaker group — compute mini-standings and pick winner */
export function resolveTiebreakerGroup(
  group: TiebreakerGroup,
  players: Player[]
): string | null {
  const relevantPlayers = players.filter((p) =>
    group.playerIds.includes(p.id)
  );
  const miniStandings = computeStandings(relevantPlayers, group.matches);
  const top = miniStandings[0];
  if (!top) return null;

  // Check if there's still a tie at the top of the mini-standings
  const tied = miniStandings.filter((e) => e.points === top.points);
  if (tied.length > 1) return null; // still tied — need more matches

  return top.playerId;
}

/** Create a knockout match */
export function createKnockoutMatch(
  p1Id: string,
  p2Id: string,
  stage: Match["stage"]
): Match {
  return {
    id: generateId(),
    player1Id: p1Id,
    player2Id: p2Id,
    result: null,
    stage,
  };
}

/** Get winner of a match */
export function getMatchWinner(match: Match): string | null {
  if (match.result === "player1_win") return match.player1Id;
  if (match.result === "player2_win") return match.player2Id;
  return null;
}

/** Get loser of a match */
export function getMatchLoser(match: Match): string | null {
  if (match.result === "player1_win") return match.player2Id;
  if (match.result === "player2_win") return match.player1Id;
  return null;
}

const KO_SUMMARY_LABELS: Record<string, string> = {
  qualifier1: "Qualifier 1",
  eliminator: "Eliminator",
  qualifier2: "Qualifier 2",
  final: "Grand Final",
};

const KO_SUMMARY_STAGE_ORDER: (keyof KnockoutState)[] = [
  "qualifier1",
  "eliminator",
  "qualifier2",
  "final",
];

/** One-line recap for a finished knockout match (or null if not decided). */
export function formatKnockoutMatchResult(players: Player[], match: Match, label: string): string | null {
  if (match.result === null) return null;
  const n1 = getPlayerName(players, match.player1Id);
  const n2 = getPlayerName(players, match.player2Id);
  if (match.result === "draw") {
    return `${label} · Draw · ${n1} vs ${n2}`;
  }
  const w = getMatchWinner(match);
  const l = getMatchLoser(match);
  if (!w || !l) return null;
  return `${label} · ${getPlayerName(players, w)} def. ${getPlayerName(players, l)}`;
}

export interface KnockoutSummaryRow {
  stageKey: keyof KnockoutState;
  line: string;
}

/** Completed knockout results in bracket order (Q1 → Elim → Q2 → Final). */
export function getKnockoutCompletedSummaries(players: Player[], ko: KnockoutState): KnockoutSummaryRow[] {
  const rows: KnockoutSummaryRow[] = [];
  for (const key of KO_SUMMARY_STAGE_ORDER) {
    const raw = ko[key];
    if (key === "champion" || !raw || typeof raw === "string") continue;
    const match = raw as Match;
    if (match.result === null) continue;
    const label = KO_SUMMARY_LABELS[String(key)] ?? String(key);
    const line = formatKnockoutMatchResult(players, match, label);
    if (line) rows.push({ stageKey: key, line });
  }
  return rows;
}

/** Most recent completed knockout decision in bracket order. */
export function getLastKnockoutSummary(players: Player[], ko: KnockoutState): KnockoutSummaryRow | null {
  const all = getKnockoutCompletedSummaries(players, ko);
  return all.length > 0 ? all[all.length - 1]! : null;
}

/** Initialize a fresh tournament */
export function initTournament(seeds: PlayerSeed[]): TournamentState {
  const players: Player[] = seeds.map((seed) => {
    const p: Player = { id: generateId(), name: seed.name.trim() };
    if (seed.avatarUrl) p.avatarUrl = seed.avatarUrl;
    return p;
  });

  const playerIds = players.map((p) => p.id);
  const pairs = generateRoundRobin(playerIds);
  const leagueMatches: Match[] = pairs.map(([p1, p2]) => ({
    id: generateId(),
    player1Id: p1,
    player2Id: p2,
    result: null,
    stage: "league" as const,
  }));

  return {
    players,
    leagueMatches,
    tiebreakerGroups: [],
    knockoutState: {},
    stage: "league",
    top4: [],
    currentMatchIndex: 0,
  };
}

export type PlayerProfilePatch = {
  name?: string;
  /** Omit to leave unchanged; `null` removes the photo. */
  avatarUrl?: string | null;
};

/** Update one player's display name and/or photo (same player IDs everywhere). */
export function applyPlayerProfileUpdate(
  state: TournamentState,
  playerId: string,
  patch: PlayerProfilePatch
): { ok: true; state: TournamentState } | { ok: false; error: string } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: "Player not found." };

  let nextName = player.name;
  if (typeof patch.name === "string") {
    const t = patch.name.trim();
    if (!t) return { ok: false, error: "Name cannot be empty." };
    const lower = t.toLowerCase();
    const dup = state.players.some(
      (p) => p.id !== playerId && p.name.trim().toLowerCase() === lower
    );
    if (dup) return { ok: false, error: "Each player needs a unique name." };
    nextName = t;
  }

  let nextAvatar: string | undefined = player.avatarUrl;
  if (patch.avatarUrl === null) {
    nextAvatar = undefined;
  } else if (typeof patch.avatarUrl === "string") {
    nextAvatar = patch.avatarUrl;
  }

  const players = state.players.map((p) => {
    if (p.id !== playerId) return p;
    const next: Player = { id: p.id, name: nextName };
    if (nextAvatar) next.avatarUrl = nextAvatar;
    return next;
  });

  return { ok: true, state: { ...state, players } };
}

/** Drop avatar data URLs for persistence when storage quota is exceeded. */
export function stripPlayerAvatars(state: TournamentState): TournamentState {
  return {
    ...state,
    players: state.players.map((p) => {
      const { avatarUrl: _omit, ...rest } = p;
      return rest;
    }),
  };
}

/** Apply a result to a league match */
export function applyLeagueResult(
  state: TournamentState,
  matchId: string,
  result: MatchResult
): TournamentState {
  const leagueMatches = state.leagueMatches.map((m) =>
    m.id === matchId ? { ...m, result } : m
  );
  return { ...state, leagueMatches };
}

/** Apply a result to a tiebreaker match */
export function applyTiebreakerResult(
  state: TournamentState,
  groupIndex: number,
  matchId: string,
  result: MatchResult
): TournamentState {
  const tiebreakerGroups = state.tiebreakerGroups.map((g, i) => {
    if (i !== groupIndex) return g;
    const matches = g.matches.map((m) =>
      m.id === matchId ? { ...m, result } : m
    );
    return { ...g, matches };
  });
  return { ...state, tiebreakerGroups };
}

/** Apply a result to a knockout match */
export function applyKnockoutResult(
  state: TournamentState,
  stage: keyof KnockoutState,
  result: MatchResult
): TournamentState {
  if (stage === "champion") return state;
  const match = state.knockoutState[stage];
  if (!match || typeof match === "string") return state;
  const updated = { ...match, result };
  const knockoutState = { ...state.knockoutState, [stage]: updated };
  return { ...state, knockoutState };
}

/** Advance tournament stage after league is complete */
export function advanceFromLeague(state: TournamentState): TournamentState {
  const standings = computeStandings(state.players, state.leagueMatches);

  // Check for tiebreaker need at position 4
  const tiebreakerGroups = findTiebreakerGroups(standings, [4]);

  if (tiebreakerGroups.length > 0) {
    // Generate tiebreaker matches
    const groupsWithMatches = tiebreakerGroups.map((g) => ({
      ...g,
      matches: generateTiebreakerMatches(g),
    }));
    return { ...state, stage: "tiebreaker", tiebreakerGroups: groupsWithMatches };
  }

  // No tiebreaker needed — directly go to knockout
  const top4 = standings.slice(0, 4).map((e) => e.playerId);
  return advanceToKnockout({ ...state, top4 });
}

/** Advance from tiebreaker to knockout */
export function advanceFromTiebreaker(state: TournamentState): TournamentState {
  const standings = computeStandings(state.players, state.leagueMatches);

  // Build a final ordered list: for each tiebreaker group, insert the winner at the
  // boundary position and push others below the boundary
  let resolvedStandings = [...standings];

  for (const group of state.tiebreakerGroups) {
    const winnerId = resolveTiebreakerGroup(group, state.players);
    if (!winnerId) continue;

    // Separate tied players into winner and losers
    const tiedEntries = resolvedStandings.filter((e) => group.playerIds.includes(e.playerId));
    const winnerEntry = tiedEntries.find((e) => e.playerId === winnerId);
    const loserEntries = tiedEntries.filter((e) => e.playerId !== winnerId);

    if (!winnerEntry) continue;

    // Remove all tied players from the list
    resolvedStandings = resolvedStandings.filter((e) => !group.playerIds.includes(e.playerId));

    // Find the insertion point: the boundary position (group.position - 1 is 0-indexed)
    // We want winner at index (group.position - 1) and losers after the boundary
    const insertIdx = group.position - 1;
    resolvedStandings.splice(insertIdx, 0, winnerEntry, ...loserEntries);
  }

  const top4 = resolvedStandings.slice(0, 4).map((e) => e.playerId);
  return advanceToKnockout({ ...state, top4 });
}

/** Set up knockout stage */
export function advanceToKnockout(state: TournamentState): TournamentState {
  const [p1, p2, p3, p4] = state.top4;
  const qualifier1 = createKnockoutMatch(p1, p2, "qualifier1");
  const eliminator = createKnockoutMatch(p3, p4, "eliminator");
  return {
    ...state,
    stage: "knockout",
    knockoutState: { qualifier1, eliminator },
  };
}

/** Progress knockout stage based on completed matches */
export function progressKnockout(state: TournamentState): TournamentState {
  const ko = state.knockoutState;
  let updated = { ...ko };

  // After Q1 and Eliminator are done, create Q2
  // Note: Q1 and Eliminator can be played in any order, so check both independently
  const q1Done = ko.qualifier1?.result && ko.qualifier1.result !== "draw";
  const elimDone = ko.eliminator?.result && ko.eliminator.result !== "draw";

  if (q1Done && elimDone && !ko.qualifier2) {
    const q1Loser = getMatchLoser(ko.qualifier1!);
    const elimWinner = getMatchWinner(ko.eliminator!);
    if (q1Loser && elimWinner) {
      updated.qualifier2 = createKnockoutMatch(elimWinner, q1Loser, "qualifier2");
    }
  }

  // After Q1 and Q2 are done, create Final
  const q2Done = updated.qualifier2?.result && updated.qualifier2.result !== "draw";

  if (q1Done && q2Done && !updated.final) {
    const q1Winner = getMatchWinner(ko.qualifier1!);
    const q2Winner = getMatchWinner(updated.qualifier2!);
    if (q1Winner && q2Winner) {
      updated.final = createKnockoutMatch(q1Winner, q2Winner, "final");
    }
  }

  // After Final, determine champion
  const finalDone = updated.final?.result && updated.final.result !== "draw";
  if (finalDone && !updated.champion) {
    const champion = getMatchWinner(updated.final!);
    if (champion) {
      updated.champion = champion;
    }
  }

  const isComplete = !!updated.champion;
  return {
    ...state,
    knockoutState: updated,
    stage: isComplete ? "complete" : "knockout",
  };
}

/** Get player name by id */
export function getPlayerName(players: Player[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? "Unknown";
}

/** Optional profile image URL (setup / persisted). */
export function getPlayerAvatarUrl(players: Player[], id: string): string | undefined {
  return players.find((p) => p.id === id)?.avatarUrl;
}

/** Get next unplayed league match */
export function getNextUnplayedMatch(matches: Match[]): Match | null {
  return matches.find((m) => m.result === null) ?? null;
}

/** Get all unplayed league matches */
export function getUnplayedMatches(matches: Match[]): Match[] {
  return matches.filter((m) => m.result === null);
}

/** Get completed league matches */
export function getCompletedMatches(matches: Match[]): Match[] {
  return matches.filter((m) => m.result !== null);
}

/** Win / loss / draw from a focal player's perspective */
export type LeagueOutcome = "win" | "loss" | "draw";

function findLeagueMatchBetween(matches: Match[], a: string, b: string): Match | null {
  return (
    matches.find(
      (m) =>
        m.stage === "league" &&
        ((m.player1Id === a && m.player2Id === b) || (m.player1Id === b && m.player2Id === a))
    ) ?? null
  );
}

function outcomeForPlayerInMatch(match: Match, playerId: string): LeagueOutcome | null {
  if (match.result === null) return null;
  if (match.result === "draw") return "draw";
  if (match.player1Id === playerId) {
    return match.result === "player1_win" ? "win" : "loss";
  }
  if (match.player2Id === playerId) {
    return match.result === "player2_win" ? "win" : "loss";
  }
  return null;
}

export interface MutualLeagueOpponentRow {
  opponentId: string;
  p1Outcome: LeagueOutcome;
  p2Outcome: LeagueOutcome;
}

/**
 * Opponents C where both p1 and p2 have a completed league result vs C (e.g. broadcast "common foe" intel).
 */
export function getMutualLeagueOpponentResults(
  p1Id: string,
  p2Id: string,
  leagueMatches: Match[]
): MutualLeagueOpponentRow[] {
  const opponentsOf = (pid: string): Set<string> => {
    const s = new Set<string>();
    for (const m of leagueMatches) {
      if (m.stage !== "league") continue;
      if (m.player1Id === pid) s.add(m.player2Id);
      else if (m.player2Id === pid) s.add(m.player1Id);
    }
    return s;
  };

  const n1 = opponentsOf(p1Id);
  const n2 = opponentsOf(p2Id);
  const common: string[] = [];
  for (const id of Array.from(n1)) {
    if (id !== p2Id && n2.has(id)) common.push(id);
  }

  const rows: MutualLeagueOpponentRow[] = [];
  for (const c of common) {
    const m1 = findLeagueMatchBetween(leagueMatches, p1Id, c);
    const m2 = findLeagueMatchBetween(leagueMatches, p2Id, c);
    const o1 = m1 ? outcomeForPlayerInMatch(m1, p1Id) : null;
    const o2 = m2 ? outcomeForPlayerInMatch(m2, p2Id) : null;
    if (o1 && o2) {
      rows.push({ opponentId: c, p1Outcome: o1, p2Outcome: o2 });
    }
  }
  return rows;
}

/** W / L / D sequence from completed league matches, in fixture list order (last `n` kept). */
export type FormLetter = "W" | "L" | "D";

export function getLeagueFormLastN(playerId: string, leagueMatches: Match[], n: number): FormLetter[] {
  const out: FormLetter[] = [];
  for (const m of leagueMatches) {
    if (m.stage !== "league" || m.result === null) continue;
    if (m.player1Id !== playerId && m.player2Id !== playerId) continue;
    if (m.result === "draw") {
      out.push("D");
    } else if (m.player1Id === playerId) {
      out.push(m.result === "player1_win" ? "W" : "L");
    } else {
      out.push(m.result === "player2_win" ? "W" : "L");
    }
  }
  return out.slice(-n);
}

export interface LeagueTickerItem {
  id: string;
  label: string;
}

/** Most recently completed league results first (by order in `leagueMatches` array). */
export function getRecentLeagueTickerItems(
  players: Player[],
  leagueMatches: Match[],
  limit: number
): LeagueTickerItem[] {
  const items: LeagueTickerItem[] = [];
  for (let i = leagueMatches.length - 1; i >= 0 && items.length < limit; i--) {
    const m = leagueMatches[i];
    if (m.stage !== "league" || m.result === null) continue;
    const a = getPlayerName(players, m.player1Id);
    const b = getPlayerName(players, m.player2Id);
    let label: string;
    if (m.result === "draw") label = `${a} · DRAW · ${b}`;
    else if (m.result === "player1_win") label = `${a} beat ${b}`;
    else label = `${b} beat ${a}`;
    items.push({ id: m.id, label });
  }
  return items;
}

/**
 * Most recent completed league meeting between two players (by later index in `leagueMatches`).
 * Returns a short viewer line, e.g. "Last meeting: Ava def. Bea".
 */
export function getLastLeagueHeadToHeadSummary(
  players: Player[],
  leagueMatches: Match[],
  p1Id: string,
  p2Id: string
): string | null {
  for (let i = leagueMatches.length - 1; i >= 0; i--) {
    const m = leagueMatches[i];
    if (m.stage !== "league" || m.result === null) continue;
    const pair =
      (m.player1Id === p1Id && m.player2Id === p2Id) || (m.player1Id === p2Id && m.player2Id === p1Id);
    if (!pair) continue;
    const a = getPlayerName(players, p1Id);
    const b = getPlayerName(players, p2Id);
    if (m.result === "draw") {
      return `Last meeting: Draw · ${a} vs ${b}`;
    }
    const w = getMatchWinner(m);
    const l = getMatchLoser(m);
    if (!w || !l) continue;
    return `Last meeting: ${getPlayerName(players, w)} def. ${getPlayerName(players, l)}`;
  }
  return null;
}

/** Display line for Qualifier 1: who won the last round-robin meeting between these two. */
export function getRoundRobinLastMeetingLine(
  players: Player[],
  leagueMatches: Match[],
  p1Id: string,
  p2Id: string
): string | null {
  for (let i = leagueMatches.length - 1; i >= 0; i--) {
    const m = leagueMatches[i];
    if (m.stage !== "league" || m.result === null) continue;
    const pair =
      (m.player1Id === p1Id && m.player2Id === p2Id) || (m.player1Id === p2Id && m.player2Id === p1Id);
    if (!pair) continue;
    const a = getPlayerName(players, p1Id);
    const b = getPlayerName(players, p2Id);
    if (m.result === "draw") {
      return `Last time they met in the round robin: draw · ${a} vs ${b}`;
    }
    const w = getMatchWinner(m);
    if (!w) continue;
    return `${getPlayerName(players, w)} won last time they met in the round robin`;
  }
  return null;
}
