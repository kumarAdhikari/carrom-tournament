// =============================================================================
// CARROM TOURNAMENT — League Page
// Design: Dark Luxury Sports | Active match card with red glow
// =============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, ChevronRight, Trophy, List, AlertTriangle, Swords, Monitor, UserPen } from "lucide-react";
import { Link } from "wouter";
import { PlayerFaceCircle } from "@/components/PlayerFaceCircle";
import { useTournament } from "@/contexts/TournamentContext";
import {
  computeStandings,
  getPlayerAvatarUrl,
  getPlayerName,
  isLeagueComplete,
  Match,
  MatchResult,
} from "@/lib/tournament";
import { Button } from "@/components/ui/button";

type ViewMode = "current" | "all" | "standings";

export default function LeaguePage() {
  const { state, setLeagueResult, setCurrentMatch, advanceLeague } = useTournament();
  const { players, leagueMatches, currentMatchIndex } = state;
  const [view, setView] = useState<ViewMode>("current");
  const [confirmAdvance, setConfirmAdvance] = useState(false);

  const standings = computeStandings(players, leagueMatches);
  const leagueComplete = isLeagueComplete(leagueMatches);
  const completedCount = leagueMatches.filter((m) => m.result !== null).length;
  const progress = (completedCount / leagueMatches.length) * 100;

  const currentMatch = leagueMatches[currentMatchIndex] ?? leagueMatches.find((m) => m.result === null);

  const handleResult = (match: Match, result: MatchResult) => {
    setLeagueResult(match.id, result);
  };

  return (
    <div className="min-h-screen" style={{ background: "#0D0D0D" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 py-4 border-b"
        style={{ background: "rgba(13,13,13,0.95)", backdropFilter: "blur(12px)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#EFEFEF" }}>
                League Stage
              </h1>
              <p className="text-xs" style={{ color: "rgba(239,239,239,0.4)" }}>
                {completedCount} / {leagueMatches.length} matches played
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <Link href="/players">
                <span
                  className="inline-flex px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer items-center gap-1.5"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(239,239,239,0.55)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  title="Edit names and profile photos"
                >
                  <UserPen className="w-3.5 h-3.5" />
                  Roster
                </span>
              </Link>
              <button
                type="button"
                onClick={() => window.open(`${window.location.origin}/display`, "_blank", "noopener,noreferrer")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(239,239,239,0.55)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                title="Open broadcast view on another screen"
              >
                <Monitor className="w-3.5 h-3.5" />
                Display
              </button>
              {(["current", "all", "standings"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-200"
                  style={{
                    background: view === v ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.05)",
                    color: view === v ? "#DC2626" : "rgba(239,239,239,0.5)",
                    border: `1px solid ${view === v ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {v === "current" ? "Current" : v === "all" ? "All Games" : "Standings"}
                </button>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #DC2626, #991B1B)" }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* CURRENT MATCH VIEW */}
          {view === "current" && (
            <motion.div
              key="current"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              {currentMatch && !currentMatch.result ? (
                <ActiveMatchCard
                  match={currentMatch}
                  players={players}
                  onResult={handleResult}
                />
              ) : leagueComplete ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: "#DC2626" }} />
                  <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: "#EFEFEF" }}>
                    League Complete!
                  </h2>
                  <p className="text-sm mb-6" style={{ color: "rgba(239,239,239,0.5)" }}>
                    All matches have been played. Ready to advance to knockout stage.
                  </p>
                  {!confirmAdvance ? (
                    <Button
                      onClick={() => setConfirmAdvance(true)}
                      className="px-8 h-12 text-base font-semibold rounded-xl"
                      style={{ background: "linear-gradient(135deg, #DC2626, #991B1B)", color: "#EFEFEF", border: "none", boxShadow: "0 4px 20px rgba(220,38,38,0.3)" }}
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Advance to Knockout
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm" style={{ color: "#DC2626" }}>
                        <AlertTriangle className="inline w-4 h-4 mr-1" />
                        This will lock the league results. Are you sure?
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button
                          onClick={() => setConfirmAdvance(false)}
                          variant="outline"
                          className="px-6"
                          style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(239,239,239,0.7)", background: "transparent" }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={advanceLeague}
                          className="px-6"
                          style={{ background: "linear-gradient(135deg, #DC2626, #991B1B)", color: "#EFEFEF", border: "none" }}
                        >
                          Confirm
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8" style={{ color: "rgba(239,239,239,0.4)" }}>
                  All remaining matches are already recorded.
                </div>
              )}

              {/* Upcoming matches preview */}
              {!leagueComplete && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "rgba(239,239,239,0.5)" }}>
                    <List className="w-4 h-4" />
                    Upcoming
                  </h3>
                  <div className="space-y-2">
                    {leagueMatches
                      .filter((m) => m.result === null && m.id !== currentMatch?.id)
                      .slice(0, 4)
                      .map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            const idx = leagueMatches.indexOf(m);
                            setCurrentMatch(idx);
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all duration-200 hover:scale-[1.01]"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            color: "rgba(239,239,239,0.6)",
                          }}
                        >
                          <span>{getPlayerName(players, m.player1Id)}</span>
                          <span style={{ color: "rgba(239,239,239,0.3)" }}>vs</span>
                          <span>{getPlayerName(players, m.player2Id)}</span>
                          <ChevronRight className="w-4 h-4 opacity-40" />
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ALL MATCHES VIEW */}
          {view === "all" && (
            <motion.div
              key="all"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "rgba(239,239,239,0.5)" }}>
                <Swords className="w-4 h-4" />
                All {leagueMatches.length} Matches
              </h3>
              {leagueMatches.map((match, idx) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  players={players}
                  index={idx + 1}
                  isActive={idx === currentMatchIndex}
                  onSelect={() => {
                    setCurrentMatch(idx);
                    setView("current");
                  }}
                  onResult={(result) => handleResult(match, result)}
                />
              ))}
            </motion.div>
          )}

          {/* STANDINGS VIEW */}
          {view === "standings" && (
            <motion.div
              key="standings"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <StandingsTable standings={standings} players={players} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Active Match Card ───────────────────────────────────────────────────────

function ActiveMatchCard({
  match,
  players,
  onResult,
}: {
  match: Match;
  players: ReturnType<typeof useTournament>["state"]["players"];
  onResult: (match: Match, result: MatchResult) => void;
}) {
  const p1 = getPlayerName(players, match.player1Id);
  const p2 = getPlayerName(players, match.player2Id);

  return (
    <motion.div
      initial={{ scale: 0.97, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="rounded-2xl p-6 relative overflow-hidden animate-pulse-glow"
      style={{
        background: "rgba(28,28,28,0.9)",
        border: "1px solid rgba(220,38,38,0.25)",
      }}
    >
      {/* Red glow top border */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: "linear-gradient(90deg, transparent, #DC2626, transparent)" }}
      />

      <div className="text-center mb-2">
        <span
          className="text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full"
          style={{ background: "rgba(220,38,38,0.15)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.3)" }}
        >
          Now Playing
        </span>
      </div>

      {/* Players */}
      <div className="flex items-center justify-between gap-4 my-8">
        <PlayerDisc
          name={p1}
          color="white"
          avatarUrl={getPlayerAvatarUrl(players, match.player1Id)}
        />
        <div className="text-center">
          <div className="text-3xl font-black" style={{ fontFamily: "'Playfair Display', serif", color: "rgba(239,239,239,0.2)" }}>
            VS
          </div>
        </div>
        <PlayerDisc
          name={p2}
          color="black"
          avatarUrl={getPlayerAvatarUrl(players, match.player2Id)}
        />
      </div>

      {/* Result buttons */}
      <div className="space-y-3">
        <p className="text-center text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "rgba(239,239,239,0.4)" }}>
          Record Result
        </p>
        <div className="grid grid-cols-3 gap-3">
          <ResultButton
            label={`${p1} Wins`}
            sublabel="2 pts"
            color="white"
            onClick={() => onResult(match, "player1_win")}
          />
          <ResultButton
            label="Draw"
            sublabel="1 pt each"
            color="gray"
            onClick={() => onResult(match, "draw")}
          />
          <ResultButton
            label={`${p2} Wins`}
            sublabel="2 pts"
            color="black"
            onClick={() => onResult(match, "player2_win")}
          />
        </div>
      </div>
    </motion.div>
  );
}

function PlayerDisc({
  name,
  color,
  avatarUrl,
}: {
  name: string;
  color: "white" | "black";
  avatarUrl?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 flex-1">
      <PlayerFaceCircle
        name={name}
        avatarUrl={avatarUrl}
        tone={color === "white" ? "cardWhite" : "cardBlack"}
        className="h-16 w-16 text-xl"
      />
      <span className="text-sm font-semibold text-center" style={{ color: "#EFEFEF", maxWidth: 80, wordBreak: "break-word" }}>
        {name}
      </span>
    </div>
  );
}

function ResultButton({
  label,
  sublabel,
  color,
  onClick,
}: {
  label: string;
  sublabel: string;
  color: "white" | "black" | "gray";
  onClick: () => void;
}) {
  const styles = {
    white: {
      bg: "rgba(245,245,245,0.1)",
      border: "rgba(245,245,245,0.2)",
      hoverBg: "rgba(245,245,245,0.18)",
      color: "#EFEFEF",
    },
    black: {
      bg: "rgba(30,30,30,0.8)",
      border: "rgba(255,255,255,0.12)",
      hoverBg: "rgba(50,50,50,0.9)",
      color: "#EFEFEF",
    },
    gray: {
      bg: "rgba(220,38,38,0.1)",
      border: "rgba(220,38,38,0.25)",
      hoverBg: "rgba(220,38,38,0.2)",
      color: "#DC2626",
    },
  }[color];

  return (
    <motion.button
      whileTap={{ scale: 0.95, y: 2 }}
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center py-4 px-2 rounded-xl text-center transition-all duration-150"
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.color,
      }}
    >
      <span className="text-xs font-semibold leading-tight">{label}</span>
      <span className="text-xs opacity-60 mt-1">{sublabel}</span>
    </motion.button>
  );
}

// ─── Match Row (All Games view) ──────────────────────────────────────────────

function MatchRow({
  match,
  players,
  index,
  isActive,
  onSelect,
  onResult,
}: {
  match: Match;
  players: ReturnType<typeof useTournament>["state"]["players"];
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onResult: (result: MatchResult) => void;
}) {
  const p1 = getPlayerName(players, match.player1Id);
  const p2 = getPlayerName(players, match.player2Id);
  const [expanded, setExpanded] = useState(false);

  const resultLabel = match.result
    ? match.result === "player1_win"
      ? `${p1} won`
      : match.result === "player2_win"
      ? `${p2} won`
      : "Draw"
    : null;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: isActive ? "rgba(220,38,38,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${isActive ? "rgba(220,38,38,0.25)" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => {
          if (!match.result) {
            onSelect();
          } else {
            setExpanded(!expanded);
          }
        }}
      >
        <span className="text-xs w-6 text-center font-mono" style={{ color: "rgba(239,239,239,0.3)" }}>
          {index}
        </span>
        <div className="flex-1 flex items-center justify-between text-sm">
          <span style={{ color: "#EFEFEF" }}>{p1}</span>
          <span className="text-xs px-2" style={{ color: "rgba(239,239,239,0.3)" }}>vs</span>
          <span style={{ color: "#EFEFEF" }}>{p2}</span>
        </div>
        {match.result ? (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "rgba(239,239,239,0.6)",
            }}
          >
            {resultLabel}
          </span>
        ) : (
          <Circle className="w-3.5 h-3.5 opacity-30" style={{ color: "#DC2626" }} />
        )}
      </div>

      {/* Inline result entry for already-played matches */}
      {match.result && expanded && (
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => onResult("player1_win")}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: match.result === "player1_win" ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.05)", color: match.result === "player1_win" ? "#DC2626" : "rgba(239,239,239,0.5)", border: `1px solid ${match.result === "player1_win" ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.08)"}` }}
          >
            {p1} wins
          </button>
          <button
            onClick={() => onResult("draw")}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: match.result === "draw" ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.05)", color: match.result === "draw" ? "#DC2626" : "rgba(239,239,239,0.5)", border: `1px solid ${match.result === "draw" ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.08)"}` }}
          >
            Draw
          </button>
          <button
            onClick={() => onResult("player2_win")}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: match.result === "player2_win" ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.05)", color: match.result === "player2_win" ? "#DC2626" : "rgba(239,239,239,0.5)", border: `1px solid ${match.result === "player2_win" ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.08)"}` }}
          >
            {p2} wins
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Standings Table ─────────────────────────────────────────────────────────

export function StandingsTable({
  standings,
  players,
  highlightTop4 = true,
}: {
  standings: ReturnType<typeof computeStandings>;
  players: ReturnType<typeof useTournament>["state"]["players"];
  highlightTop4?: boolean;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Table header */}
      <div
        className="grid text-xs font-semibold tracking-widest uppercase px-4 py-3"
        style={{
          gridTemplateColumns: "2rem 1fr 3rem 3rem 3rem 3rem 3.5rem",
          background: "rgba(220,38,38,0.08)",
          color: "rgba(239,239,239,0.4)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span>#</span>
        <span>Player</span>
        <span className="text-center">P</span>
        <span className="text-center">W</span>
        <span className="text-center">D</span>
        <span className="text-center">L</span>
        <span className="text-center">Pts</span>
      </div>

      {standings.map((entry, idx) => {
        const name = getPlayerName(players, entry.playerId);
        const isTop4 = highlightTop4 && idx < 4;
        const isBoundary = highlightTop4 && idx === 3;

        return (
          <motion.div
            key={entry.playerId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="grid items-center px-4 py-3 text-sm"
            style={{
              gridTemplateColumns: "2rem 1fr 3rem 3rem 3rem 3rem 3.5rem",
              background: isTop4 ? "rgba(255,255,255,0.03)" : "transparent",
              borderBottom: isBoundary
                ? "2px solid rgba(220,38,38,0.3)"
                : "1px solid rgba(255,255,255,0.04)",
              color: isTop4 ? "#EFEFEF" : "rgba(239,239,239,0.45)",
            }}
          >
            <span
              className="font-bold text-xs"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: idx === 0 ? "#DC2626" : isTop4 ? "rgba(239,239,239,0.6)" : "rgba(239,239,239,0.25)",
              }}
            >
              {idx + 1}
            </span>
            <span className="font-medium truncate">{name}</span>
            <span className="text-center text-xs" style={{ color: "rgba(239,239,239,0.4)" }}>{entry.played}</span>
            <span className="text-center text-xs" style={{ color: "rgba(239,239,239,0.4)" }}>{entry.won}</span>
            <span className="text-center text-xs" style={{ color: "rgba(239,239,239,0.4)" }}>{entry.drawn}</span>
            <span className="text-center text-xs" style={{ color: "rgba(239,239,239,0.4)" }}>{entry.lost}</span>
            <span
              className="text-center font-bold"
              style={{ color: isTop4 ? "#DC2626" : "rgba(239,239,239,0.3)" }}
            >
              {entry.points}
            </span>
          </motion.div>
        );
      })}

      {highlightTop4 && (
        <div className="px-4 py-2 text-xs" style={{ color: "rgba(239,239,239,0.3)", background: "rgba(220,38,38,0.04)" }}>
          Top 4 advance to knockout stage
        </div>
      )}
    </div>
  );
}
