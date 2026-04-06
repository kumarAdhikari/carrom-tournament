// =============================================================================
// CARROM TOURNAMENT — Knockout Page
// Design: Dark Luxury Sports | IPL-style bracket flow
// Stages: Qualifier 1 | Eliminator | Qualifier 2 | Final
// =============================================================================

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronRight, Crown, Star, UserPen } from "lucide-react";
import { Link } from "wouter";
import { PlayerFaceCircle } from "@/components/PlayerFaceCircle";
import { useTournament } from "@/contexts/TournamentContext";
import {
  getPlayerAvatarUrl,
  getPlayerName,
  getMatchWinner,
  getMatchLoser,
  Match,
  MatchResult,
  KnockoutState,
} from "@/lib/tournament";
import { useState } from "react"; // used in KnockoutMatchRow
import { BROWSER_LOCAL_ONLY } from "@/lib/runtimeConfig";

const TROPHY_IMAGE = BROWSER_LOCAL_ONLY
  ? null
  : "https://d2xsxph8kpxj0f.cloudfront.net/310519663520936534/dGSgQU9Fiuj7sPUNP9JTix/carrom-trophy-RSEb467A5Hbgr89TKX7kSE.webp";

export default function KnockoutPage() {
  const { state, setKnockoutResult } = useTournament();
  const { players, knockoutState, top4 } = state;
  // Determine which stage is currently active (next to be played)
  // Q1 and Eliminator can be played in any order (both available simultaneously)
  const getActiveStage = (): keyof KnockoutState | null => {
    if (!knockoutState.qualifier1?.result) return "qualifier1";
    if (!knockoutState.eliminator?.result) return "eliminator";
    if (knockoutState.qualifier2 && !knockoutState.qualifier2.result) return "qualifier2";
    if (knockoutState.final && !knockoutState.final.result) return "final";
    return null;
  };

  const currentStage = getActiveStage();

  const handleResult = (stage: keyof KnockoutState, result: MatchResult) => {
    setKnockoutResult(stage, result);
  };

  const champion = knockoutState.champion;

  return (
    <div className="min-h-screen" style={{ background: "#0D0D0D" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 py-4 border-b"
        style={{ background: "rgba(13,13,13,0.95)", backdropFilter: "blur(12px)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#EFEFEF" }}>
              Knockout Stage
            </h1>
            <p className="text-xs" style={{ color: "rgba(239,239,239,0.4)" }}>
              IPL-style elimination bracket
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <Link href="/players">
              <span
                className="inline-flex px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer items-center gap-1.5"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(239,239,239,0.55)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <UserPen className="w-3.5 h-3.5" />
                Roster
              </span>
            </Link>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "rgba(220,38,38,0.12)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.25)" }}
            >
              <Trophy className="w-3.5 h-3.5" />
              Top 4
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Champion celebration */}
        <AnimatePresence>
          {champion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl overflow-hidden mb-8 relative"
              style={{ border: "1px solid rgba(220,38,38,0.4)" }}
            >
              {/* Background trophy image */}
              {TROPHY_IMAGE && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-15"
                  style={{ backgroundImage: `url(${TROPHY_IMAGE})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

              <div className="relative z-10 text-center py-12 px-6">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <Crown className="w-16 h-16 mx-auto mb-4" style={{ color: "#DC2626" }} />
                </motion.div>
                <p className="text-sm tracking-widest uppercase mb-2" style={{ color: "rgba(239,239,239,0.5)" }}>
                  Tournament Champion
                </p>
                <h2
                  className="text-4xl font-black mb-2"
                  style={{ fontFamily: "'Playfair Display', serif", color: "#EFEFEF" }}
                >
                  {getPlayerName(players, champion)}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                    >
                      <Star className="w-5 h-5 fill-current" style={{ color: "#DC2626" }} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bracket Flow Diagram */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "rgba(239,239,239,0.4)" }}>
            Bracket Overview
          </h3>
          <BracketDiagram knockoutState={knockoutState} players={players} top4={top4} />
        </div>

        {/* Active match card */}
        {currentStage && knockoutState[currentStage] && typeof knockoutState[currentStage] !== "string" && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "rgba(239,239,239,0.4)" }}>
              Current Match
            </h3>
            <KnockoutMatchCard
              stage={currentStage}
              match={knockoutState[currentStage] as Match}
              players={players}
              onResult={(result) => handleResult(currentStage, result)}
            />
          </div>
        )}

        {/* All knockout matches */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "rgba(239,239,239,0.4)" }}>
            All Matches
          </h3>
          {(["qualifier1", "eliminator", "qualifier2", "final"] as const).map((stage) => {
            const match = knockoutState[stage];
            if (!match || typeof match === "string") return null;
            return (
              <KnockoutMatchRow
                key={stage}
                stage={stage}
                match={match}
                players={players}
                isActive={currentStage === stage}
                onResult={(result) => handleResult(stage, result)}
              />
            );
          })}
        </div>

        {/* Final standings summary */}
        {champion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 rounded-2xl p-5"
            style={{ background: "rgba(28,28,28,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "'Playfair Display', serif", color: "rgba(239,239,239,0.6)" }}>
              Final Standings
            </h3>
            <div className="space-y-2">
              {[
                { label: "Champion", playerId: champion, icon: "🏆" },
                { label: "Runner-up", playerId: knockoutState.final ? (getMatchLoser(knockoutState.final as Match) ?? "") : "", icon: "🥈" },
              ].map(({ label, playerId, icon }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-lg">{icon}</span>
                  <div>
                    <div className="text-xs" style={{ color: "rgba(239,239,239,0.4)" }}>{label}</div>
                    <div className="text-sm font-semibold" style={{ color: "#EFEFEF" }}>{getPlayerName(players, playerId)}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Bracket Diagram ─────────────────────────────────────────────────────────

function BracketDiagram({
  knockoutState,
  players,
  top4,
}: {
  knockoutState: KnockoutState;
  players: ReturnType<typeof useTournament>["state"]["players"];
  top4: string[];
}) {
  const getName = (id?: string) => (id ? getPlayerName(players, id) : "TBD");

  const q1 = knockoutState.qualifier1;
  const elim = knockoutState.eliminator;
  const q2 = knockoutState.qualifier2;
  const final = knockoutState.final;

  const q1Winner = q1?.result ? getMatchWinner(q1) : null;
  const q1Loser = q1?.result ? getMatchLoser(q1) : null;
  const elimWinner = elim?.result ? getMatchWinner(elim) : null;
  const q2Winner = q2?.result ? getMatchWinner(q2) : null;
  const champion = knockoutState.champion;

  return (
    <div
      className="rounded-2xl p-5 overflow-x-auto"
      style={{ background: "rgba(28,28,28,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="min-w-[520px]">
        {/* Row 1: Q1 and Eliminator */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <BracketMatch
            label="Qualifier 1"
            sublabel="Winner → Final"
            p1={getName(q1?.player1Id)}
            p2={getName(q1?.player2Id)}
            winner={q1Winner ? getName(q1Winner) : null}
            loserNote="Loser → Q2"
            isPlayed={!!q1?.result}
          />
          <BracketMatch
            label="Eliminator"
            sublabel="Winner → Q2"
            p1={getName(elim?.player1Id)}
            p2={getName(elim?.player2Id)}
            winner={elimWinner ? getName(elimWinner) : null}
            loserNote="Loser eliminated"
            isPlayed={!!elim?.result}
            isEliminator
          />
        </div>

        {/* Connector arrows */}
        <div className="flex justify-center mb-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(239,239,239,0.3)" }}>
            <span>Q1 Loser + Elim Winner</span>
            <ChevronRight className="w-3 h-3" />
            <span style={{ color: "#DC2626" }}>Qualifier 2</span>
          </div>
        </div>

        {/* Row 2: Q2 */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <BracketMatch
            label="Qualifier 2"
            sublabel="Winner → Final"
            p1={getName(q2?.player1Id)}
            p2={getName(q2?.player2Id)}
            winner={q2Winner ? getName(q2Winner) : null}
            loserNote="Loser eliminated"
            isPlayed={!!q2?.result}
            isEliminator
          />
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-xs mb-1" style={{ color: "rgba(239,239,239,0.3)" }}>Q1 Winner advances directly</div>
              <div
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: q1Winner ? "rgba(220,38,38,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${q1Winner ? "rgba(220,38,38,0.25)" : "rgba(255,255,255,0.08)"}`,
                  color: q1Winner ? "#DC2626" : "rgba(239,239,239,0.3)",
                }}
              >
                {q1Winner ? getName(q1Winner) : "Awaiting Q1"}
              </div>
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="flex justify-center mb-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(239,239,239,0.3)" }}>
            <span>Q1 Winner + Q2 Winner</span>
            <ChevronRight className="w-3 h-3" />
            <span style={{ color: "#DC2626" }}>Grand Final</span>
          </div>
        </div>

        {/* Final */}
        <BracketMatch
          label="Grand Final"
          sublabel="Tournament Champion"
          p1={getName(final?.player1Id)}
          p2={getName(final?.player2Id)}
          winner={champion ? getName(champion) : null}
          isPlayed={!!final?.result}
          isFinal
        />
      </div>
    </div>
  );
}

function BracketMatch({
  label,
  sublabel,
  p1,
  p2,
  winner,
  loserNote,
  isPlayed,
  isEliminator,
  isFinal,
}: {
  label: string;
  sublabel: string;
  p1: string;
  p2: string;
  winner: string | null;
  loserNote?: string;
  isPlayed: boolean;
  isEliminator?: boolean;
  isFinal?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: isFinal ? "rgba(220,38,38,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${isFinal ? "rgba(220,38,38,0.25)" : isEliminator ? "rgba(255,100,100,0.15)" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-semibold"
          style={{ color: isFinal ? "#DC2626" : "rgba(239,239,239,0.6)" }}
        >
          {label}
        </span>
        {isPlayed && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
            Done
          </span>
        )}
      </div>
      <div className="space-y-1 mb-2">
        <div
          className="text-xs px-2 py-1 rounded flex items-center justify-between"
          style={{
            background: winner === p1 ? "rgba(220,38,38,0.12)" : "rgba(255,255,255,0.04)",
            color: winner === p1 ? "#DC2626" : winner && winner !== p1 ? "rgba(239,239,239,0.3)" : "#EFEFEF",
          }}
        >
          <span className="truncate">{p1}</span>
          {winner === p1 && <Crown className="w-3 h-3 ml-1 flex-shrink-0" />}
        </div>
        <div className="text-center text-xs" style={{ color: "rgba(239,239,239,0.2)" }}>vs</div>
        <div
          className="text-xs px-2 py-1 rounded flex items-center justify-between"
          style={{
            background: winner === p2 ? "rgba(220,38,38,0.12)" : "rgba(255,255,255,0.04)",
            color: winner === p2 ? "#DC2626" : winner && winner !== p2 ? "rgba(239,239,239,0.3)" : "#EFEFEF",
          }}
        >
          <span className="truncate">{p2}</span>
          {winner === p2 && <Crown className="w-3 h-3 ml-1 flex-shrink-0" />}
        </div>
      </div>
      <div className="text-xs" style={{ color: "rgba(239,239,239,0.3)" }}>
        {sublabel}
        {loserNote && <span className="ml-1 opacity-60">· {loserNote}</span>}
      </div>
    </div>
  );
}

// ─── Knockout Match Card (Active) ────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  qualifier1: "Qualifier 1",
  eliminator: "Eliminator",
  qualifier2: "Qualifier 2",
  final: "Grand Final",
};

const STAGE_SUBLABELS: Record<string, string> = {
  qualifier1: "Winner → Final · Loser → Q2",
  eliminator: "Winner → Q2 · Loser eliminated",
  qualifier2: "Winner → Final · Loser eliminated",
  final: "Tournament Champion",
};

function KnockoutMatchCard({
  stage,
  match,
  players,
  onResult,
}: {
  stage: string;
  match: Match;
  players: ReturnType<typeof useTournament>["state"]["players"];
  onResult: (result: MatchResult) => void;
}) {
  const p1 = getPlayerName(players, match.player1Id);
  const p2 = getPlayerName(players, match.player2Id);
  const isFinal = stage === "final";
  const isEliminator = stage === "eliminator" || stage === "qualifier2";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl p-6 relative overflow-hidden animate-pulse-glow"
      style={{
        background: "rgba(28,28,28,0.9)",
        border: `1px solid ${isFinal ? "rgba(220,38,38,0.4)" : "rgba(220,38,38,0.2)"}`,
      }}
    >
      {/* Top border glow */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: "linear-gradient(90deg, transparent, #DC2626, transparent)" }}
      />

      <div className="text-center mb-4">
        <span
          className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full"
          style={{
            background: isFinal ? "rgba(220,38,38,0.2)" : "rgba(220,38,38,0.12)",
            color: "#DC2626",
            border: "1px solid rgba(220,38,38,0.3)",
          }}
        >
          {STAGE_LABELS[stage] ?? stage}
        </span>
        <p className="text-xs mt-2" style={{ color: "rgba(239,239,239,0.4)" }}>
          {STAGE_SUBLABELS[stage]}
        </p>
      </div>

      {/* Players */}
      <div className="flex items-center justify-between gap-4 my-6">
        <div className="flex flex-col items-center gap-2 flex-1">
          <PlayerFaceCircle
            name={p1}
            avatarUrl={getPlayerAvatarUrl(players, match.player1Id)}
            tone="cardWhite"
            className="h-16 w-16 text-xl"
          />
          <span className="text-sm font-semibold text-center" style={{ color: "#EFEFEF" }}>{p1}</span>
        </div>
        <div className="text-3xl font-black" style={{ fontFamily: "'Playfair Display', serif", color: "rgba(239,239,239,0.15)" }}>
          VS
        </div>
        <div className="flex flex-col items-center gap-2 flex-1">
          <PlayerFaceCircle
            name={p2}
            avatarUrl={getPlayerAvatarUrl(players, match.player2Id)}
            tone="cardBlack"
            className="h-16 w-16 text-xl"
          />
          <span className="text-sm font-semibold text-center" style={{ color: "#EFEFEF" }}>{p2}</span>
        </div>
      </div>

      {/* Result buttons — no draw for knockout */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          whileTap={{ scale: 0.95, y: 2 }}
          whileHover={{ scale: 1.03 }}
          onClick={() => onResult("player1_win")}
          className="py-4 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "rgba(245,245,245,0.1)", border: "1px solid rgba(245,245,245,0.2)", color: "#EFEFEF" }}
        >
          <div>{p1}</div>
          <div className="text-xs opacity-60 mt-0.5">Wins</div>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95, y: 2 }}
          whileHover={{ scale: 1.03 }}
          onClick={() => onResult("player2_win")}
          className="py-4 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "rgba(30,30,30,0.8)", border: "1px solid rgba(255,255,255,0.12)", color: "#EFEFEF" }}
        >
          <div>{p2}</div>
          <div className="text-xs opacity-60 mt-0.5">Wins</div>
        </motion.button>
      </div>

      {isEliminator && (
        <p className="text-center text-xs mt-3" style={{ color: "rgba(220,38,38,0.6)" }}>
          ⚠ Loser is eliminated from the tournament
        </p>
      )}
    </motion.div>
  );
}

// ─── Knockout Match Row ───────────────────────────────────────────────────────

function KnockoutMatchRow({
  stage,
  match,
  players,
  isActive,
  onResult,
}: {
  stage: keyof KnockoutState;
  match: Match;
  players: ReturnType<typeof useTournament>["state"]["players"];
  isActive: boolean;
  onResult: (result: MatchResult) => void;
}) {
  const p1 = getPlayerName(players, match.player1Id);
  const p2 = getPlayerName(players, match.player2Id);
  const winner = match.result ? getMatchWinner(match) : null;
  const [expanded, setExpanded] = useState(false);

  const resultLabel = match.result
    ? match.result === "player1_win"
      ? `${p1} won`
      : `${p2} won`
    : null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: isActive ? "rgba(220,38,38,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${isActive ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => match.result && setExpanded(!expanded)}
      >
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0"
          style={{
            background: isActive ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.06)",
            color: isActive ? "#DC2626" : "rgba(239,239,239,0.4)",
          }}
        >
          {STAGE_LABELS[stage as string] ?? stage}
        </span>
        <div className="flex-1 flex items-center justify-between text-sm">
          <span style={{ color: "#EFEFEF" }}>{p1}</span>
          <span className="text-xs" style={{ color: "rgba(239,239,239,0.3)" }}>vs</span>
          <span style={{ color: "#EFEFEF" }}>{p2}</span>
        </div>
        {resultLabel && (
          <span className="text-xs" style={{ color: "rgba(239,239,239,0.5)" }}>
            {resultLabel}
          </span>
        )}
      </div>

      {/* Edit result */}
      {match.result && expanded && (
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => onResult("player1_win")}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: match.result === "player1_win" ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.05)", color: match.result === "player1_win" ? "#DC2626" : "rgba(239,239,239,0.5)", border: `1px solid ${match.result === "player1_win" ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.08)"}` }}
          >
            {p1} wins
          </button>
          <button
            onClick={() => onResult("player2_win")}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: match.result === "player2_win" ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.05)", color: match.result === "player2_win" ? "#DC2626" : "rgba(239,239,239,0.5)", border: `1px solid ${match.result === "player2_win" ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.08)"}` }}
          >
            {p2} wins
          </button>
        </div>
      )}
    </div>
  );
}
