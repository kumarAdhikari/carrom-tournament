// =============================================================================
// CARROM TOURNAMENT — Tournament Context
// Design: Dark Luxury Sports (IPL Trophy Night)
// =============================================================================

import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import {
  TournamentState,
  MatchResult,
  initTournament,
  PlayerSeed,
  PlayerProfilePatch,
  applyPlayerProfileUpdate,
  applyLeagueResult,
  applyTiebreakerResult,
  applyKnockoutResult,
  advanceFromLeague,
  advanceFromTiebreaker,
  progressKnockout,
  isLeagueComplete,
  isTiebreakerGroupResolved,
  resolveTiebreakerGroup,
  computeStandings,
  KnockoutState,
  stripPlayerAvatars,
} from "@/lib/tournament";

type Action =
  | { type: "INIT_TOURNAMENT"; seeds: PlayerSeed[] }
  | { type: "SET_LEAGUE_RESULT"; matchId: string; result: MatchResult }
  | { type: "SET_TIEBREAKER_RESULT"; groupIndex: number; matchId: string; result: MatchResult }
  | { type: "SET_KNOCKOUT_RESULT"; stage: keyof KnockoutState; result: MatchResult }
  | { type: "SET_CURRENT_MATCH"; index: number }
  | { type: "ADVANCE_LEAGUE" }
  | { type: "ADVANCE_TIEBREAKER" }
  | { type: "HYDRATE"; state: TournamentState }
  | { type: "UPDATE_PLAYER"; playerId: string; patch: PlayerProfilePatch }
  | { type: "RESET" };

const initialState: TournamentState = {
  players: [],
  leagueMatches: [],
  tiebreakerGroups: [],
  knockoutState: {},
  stage: "setup",
  top4: [],
  currentMatchIndex: 0,
};

const TOURNAMENT_STORAGE_KEY = "carrom_tournament_state";
const TOURNAMENT_STORAGE_VERSION = 1;
const VALID_STAGES = new Set(["setup", "league", "tiebreaker", "knockout", "complete"]);
const VALID_MATCH_RESULTS = new Set(["player1_win", "player2_win", "draw", null]);
const VALID_MATCH_STAGES = new Set([
  "league",
  "tiebreaker",
  "qualifier1",
  "eliminator",
  "qualifier2",
  "final",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidMatch(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string") return false;
  if (typeof value.player1Id !== "string") return false;
  if (typeof value.player2Id !== "string") return false;
  if (!VALID_MATCH_RESULTS.has(value.result as string | null)) return false;
  if (!VALID_MATCH_STAGES.has(value.stage as string)) return false;
  if (typeof value.round !== "undefined" && typeof value.round !== "number") return false;
  return true;
}

function isValidTournamentState(value: unknown): value is TournamentState {
  if (!isRecord(value)) return false;
  if (
    !Array.isArray(value.players) ||
    !value.players.every(
      (p) =>
        isRecord(p) &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        (typeof p.avatarUrl === "undefined" || typeof p.avatarUrl === "string")
    )
  ) {
    return false;
  }
  if (!Array.isArray(value.leagueMatches) || !value.leagueMatches.every(isValidMatch)) return false;
  if (
    !Array.isArray(value.tiebreakerGroups) ||
    !value.tiebreakerGroups.every(
      (group) =>
        isRecord(group) &&
        typeof group.position === "number" &&
        Array.isArray(group.playerIds) &&
        group.playerIds.every((id) => typeof id === "string") &&
        Array.isArray(group.matches) &&
        group.matches.every(isValidMatch) &&
        typeof group.resolved === "boolean" &&
        (typeof group.winnerId === "undefined" || typeof group.winnerId === "string")
    )
  ) {
    return false;
  }
  if (!isRecord(value.knockoutState)) return false;
  if (!VALID_STAGES.has(value.stage as string)) return false;
  if (!Array.isArray(value.top4) || !value.top4.every((id) => typeof id === "string")) return false;
  if (typeof value.currentMatchIndex !== "number") return false;

  const knockoutState = value.knockoutState as Record<string, unknown>;
  const knockoutMatchFields = ["qualifier1", "eliminator", "qualifier2", "final"];
  for (const field of knockoutMatchFields) {
    if (typeof knockoutState[field] !== "undefined" && !isValidMatch(knockoutState[field])) {
      return false;
    }
  }
  if (typeof knockoutState.champion !== "undefined" && typeof knockoutState.champion !== "string") {
    return false;
  }

  return true;
}

function serializeTournamentState(state: TournamentState): string {
  return JSON.stringify({
    version: TOURNAMENT_STORAGE_VERSION,
    state,
  });
}

function parseStoredTournamentState(raw: string | null): TournamentState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { version?: unknown; state?: unknown };
    if (parsed.version !== TOURNAMENT_STORAGE_VERSION) return null;
    if (!isValidTournamentState(parsed.state)) return null;
    return parsed.state;
  } catch {
    return null;
  }
}

/** Backup / export uses this version inside the JSON wrapper `{ version, state }`. */
export const TOURNAMENT_BACKUP_FILE_VERSION = TOURNAMENT_STORAGE_VERSION;

/**
 * Parse a downloaded backup file or equivalent JSON string (same schema as localStorage).
 * Includes full state: players with `avatarUrl` data URLs, league, tiebreaker, knockout, etc.
 */
export function parseTournamentBackupJson(raw: string): TournamentState | null {
  return parseStoredTournamentState(raw.trim());
}

function loadStoredTournamentState(): TournamentState {
  if (typeof window === "undefined") {
    return initialState;
  }

  const raw = localStorage.getItem(TOURNAMENT_STORAGE_KEY);
  const parsed = parseStoredTournamentState(raw);
  if (!parsed) {
    localStorage.removeItem(TOURNAMENT_STORAGE_KEY);
    return initialState;
  }
  return parsed;
}

function reducer(state: TournamentState, action: Action): TournamentState {
  switch (action.type) {
    case "INIT_TOURNAMENT":
      return initTournament(action.seeds);

    case "SET_LEAGUE_RESULT": {
      let next = applyLeagueResult(state, action.matchId, action.result);
      // Auto-advance current match index to next unplayed
      const nextUnplayed = next.leagueMatches.findIndex((m) => m.result === null);
      next = { ...next, currentMatchIndex: nextUnplayed === -1 ? next.leagueMatches.length - 1 : nextUnplayed };
      return next;
    }

    case "SET_TIEBREAKER_RESULT": {
      return applyTiebreakerResult(state, action.groupIndex, action.matchId, action.result);
    }

    case "SET_KNOCKOUT_RESULT": {
      let next = applyKnockoutResult(state, action.stage, action.result);
      next = progressKnockout(next);
      return next;
    }

    case "SET_CURRENT_MATCH":
      return { ...state, currentMatchIndex: action.index };

    case "ADVANCE_LEAGUE":
      return advanceFromLeague(state);

    case "ADVANCE_TIEBREAKER":
      return advanceFromTiebreaker(state);

    case "RESET":
      return { ...initialState };

    case "HYDRATE":
      return action.state;

    case "UPDATE_PLAYER": {
      const r = applyPlayerProfileUpdate(state, action.playerId, action.patch);
      return r.ok ? r.state : state;
    }

    default:
      return state;
  }
}

interface TournamentContextValue {
  state: TournamentState;
  initTournamentAction: (seeds: PlayerSeed[]) => void;
  setLeagueResult: (matchId: string, result: MatchResult) => void;
  setTiebreakerResult: (groupIndex: number, matchId: string, result: MatchResult) => void;
  setKnockoutResult: (stage: keyof KnockoutState, result: MatchResult) => void;
  setCurrentMatch: (index: number) => void;
  advanceLeague: () => void;
  advanceTiebreaker: () => void;
  reset: () => void;
  updatePlayerProfile: (
    playerId: string,
    patch: PlayerProfilePatch
  ) => { ok: true } | { ok: false; error: string };
  /** Replace in-memory state from a validated backup; persists on the next effect tick. */
  restoreTournamentFromBackup: (next: TournamentState) => void;
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, loadStoredTournamentState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const serialized = serializeTournamentState(state);
      if (localStorage.getItem(TOURNAMENT_STORAGE_KEY) === serialized) {
        return;
      }
      localStorage.setItem(TOURNAMENT_STORAGE_KEY, serialized);
    } catch (error) {
      const quotaExceeded =
        (error instanceof DOMException &&
          (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")) ||
        (typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code: number }).code === 22);

      if (quotaExceeded) {
        try {
          const slim = stripPlayerAvatars(state);
          const serialized = serializeTournamentState(slim);
          localStorage.setItem(TOURNAMENT_STORAGE_KEY, serialized);
          console.warn(
            "[carrom] Saved tournament without profile photos — browser storage was full. Use smaller photos or fewer players."
          );
        } catch (retryErr) {
          console.error("Failed to persist tournament state", retryErr);
        }
      } else {
        console.error("Failed to persist tournament state", error);
      }
    }
  }, [state]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return;
      if (event.key !== TOURNAMENT_STORAGE_KEY) return;

      const nextState = parseStoredTournamentState(event.newValue) ?? { ...initialState };
      dispatch({ type: "HYDRATE", state: nextState });
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const initTournamentAction = useCallback((seeds: PlayerSeed[]) => {
    dispatch({ type: "INIT_TOURNAMENT", seeds });
  }, []);

  const setLeagueResult = useCallback((matchId: string, result: MatchResult) => {
    dispatch({ type: "SET_LEAGUE_RESULT", matchId, result });
  }, []);

  const setTiebreakerResult = useCallback((groupIndex: number, matchId: string, result: MatchResult) => {
    dispatch({ type: "SET_TIEBREAKER_RESULT", groupIndex, matchId, result });
  }, []);

  const setKnockoutResult = useCallback((stage: keyof KnockoutState, result: MatchResult) => {
    dispatch({ type: "SET_KNOCKOUT_RESULT", stage, result });
  }, []);

  const setCurrentMatch = useCallback((index: number) => {
    dispatch({ type: "SET_CURRENT_MATCH", index });
  }, []);

  const advanceLeague = useCallback(() => {
    dispatch({ type: "ADVANCE_LEAGUE" });
  }, []);

  const advanceTiebreaker = useCallback(() => {
    dispatch({ type: "ADVANCE_TIEBREAKER" });
  }, []);

  const reset = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOURNAMENT_STORAGE_KEY);
    }
    dispatch({ type: "RESET" });
  }, []);

  const updatePlayerProfile = useCallback(
    (playerId: string, patch: PlayerProfilePatch) => {
      const r = applyPlayerProfileUpdate(state, playerId, patch);
      if (!r.ok) return r;
      dispatch({ type: "UPDATE_PLAYER", playerId, patch });
      return { ok: true as const };
    },
    [state]
  );

  const restoreTournamentFromBackup = useCallback((next: TournamentState) => {
    dispatch({ type: "HYDRATE", state: next });
  }, []);

  return (
    <TournamentContext.Provider
      value={{
        state,
        initTournamentAction,
        setLeagueResult,
        setTiebreakerResult,
        setKnockoutResult,
        setCurrentMatch,
        advanceLeague,
        advanceTiebreaker,
        reset,
        updatePlayerProfile,
        restoreTournamentFromBackup,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament must be used within TournamentProvider");
  return ctx;
}
