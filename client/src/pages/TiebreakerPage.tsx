// =============================================================================
// CARROM TOURNAMENT — Tiebreaker Page
// Design: Dark Luxury Sports | Red accent for contested positions
// =============================================================================

import { motion } from "framer-motion";
import { Swords, AlertTriangle, CheckCircle2, UserPen } from "lucide-react";
import { Link } from "wouter";
import { useTournament } from "@/contexts/TournamentContext";
import {
  getPlayerName,
  MatchResult,
  resolveTiebreakerGroup,
  isTiebreakerGroupResolved,
  computeStandings,
} from "@/lib/tournament";
import { Button } from "@/components/ui/button";

export default function TiebreakerPage() {
  const { state, setTiebreakerResult, advanceTiebreaker } = useTournament();
  const { players, tiebreakerGroups, leagueMatches } = state;

  const allResolved = tiebreakerGroups.every((g) => {
    const winner = resolveTiebreakerGroup(g, players);
    return winner !== null;
  });

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
              Tiebreaker
            </h1>
            <p className="text-xs" style={{ color: "rgba(239,239,239,0.4)" }}>
              Resolving tied positions for top 4
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={{ background: "rgba(220,38,38,0.12)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.25)" }}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Tie detected
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Explanation */}
        <div
          className="rounded-xl px-5 py-4 text-sm"
          style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", color: "rgba(239,239,239,0.65)" }}
        >
          Players are tied on points at the boundary of the top 4. They will play a mini round-robin to determine who advances.
        </div>

        {tiebreakerGroups.map((group, groupIdx) => {
          const winner = resolveTiebreakerGroup(group, players);
          const isResolved = winner !== null;

          return (
            <motion.div
              key={groupIdx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIdx * 0.1 }}
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* Group header */}
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{ background: "rgba(220,38,38,0.08)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4" style={{ color: "#DC2626" }} />
                  <span className="text-sm font-semibold" style={{ color: "#EFEFEF" }}>
                    Position {group.position} Playoff
                  </span>
                </div>
                {isResolved ? (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "#22c55e" }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Resolved
                  </div>
                ) : (
                  <span className="text-xs" style={{ color: "rgba(239,239,239,0.4)" }}>
                    {group.matches.filter((m) => m.result !== null).length}/{group.matches.length} played
                  </span>
                )}
              </div>

              {/* Contestants */}
              <div className="px-5 py-3 flex flex-wrap gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {group.playerIds.map((pid) => (
                  <span
                    key={pid}
                    className="text-xs px-3 py-1 rounded-full font-medium"
                    style={{
                      background: winner === pid ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.06)",
                      color: winner === pid ? "#DC2626" : "rgba(239,239,239,0.7)",
                      border: `1px solid ${winner === pid ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    {getPlayerName(players, pid)}
                    {winner === pid && " ✓"}
                  </span>
                ))}
              </div>

              {/* Matches */}
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {group.matches.map((match) => {
                  const p1 = getPlayerName(players, match.player1Id);
                  const p2 = getPlayerName(players, match.player2Id);

                  return (
                    <div key={match.id} className="px-5 py-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm font-medium" style={{ color: "#EFEFEF" }}>{p1}</span>
                        <span className="text-xs" style={{ color: "rgba(239,239,239,0.3)" }}>vs</span>
                        <span className="text-sm font-medium" style={{ color: "#EFEFEF" }}>{p2}</span>
                      </div>
                      {match.result ? (
                        <div className="flex gap-2">
                          {(["player1_win", "draw", "player2_win"] as MatchResult[]).map((r) => (
                            <button
                              key={r as string}
                              onClick={() => setTiebreakerResult(groupIdx, match.id, r)}
                              className="text-xs px-3 py-1.5 rounded-lg transition-all"
                              style={{
                                background: match.result === r ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.05)",
                                color: match.result === r ? "#DC2626" : "rgba(239,239,239,0.5)",
                                border: `1px solid ${match.result === r ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.08)"}`,
                              }}
                            >
                              {r === "player1_win" ? `${p1} wins` : r === "draw" ? "Draw" : `${p2} wins`}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setTiebreakerResult(groupIdx, match.id, "player1_win")}
                            className="py-2 px-3 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: "rgba(245,245,245,0.08)", border: "1px solid rgba(245,245,245,0.15)", color: "#EFEFEF" }}
                          >
                            {p1} Wins
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setTiebreakerResult(groupIdx, match.id, "draw")}
                            className="py-2 px-3 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626" }}
                          >
                            Draw
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setTiebreakerResult(groupIdx, match.id, "player2_win")}
                            className="py-2 px-3 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: "rgba(30,30,30,0.8)", border: "1px solid rgba(255,255,255,0.1)", color: "#EFEFEF" }}
                          >
                            {p2} Wins
                          </motion.button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Mini standings */}
              {group.matches.some((m) => m.result !== null) && (
                <MiniStandings group={group} players={players} />
              )}
            </motion.div>
          );
        })}

        {/* Advance button */}
        {allResolved && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center pt-4"
          >
            <Button
              onClick={advanceTiebreaker}
              className="px-8 h-12 text-base font-semibold rounded-xl"
              style={{ background: "linear-gradient(135deg, #DC2626, #991B1B)", color: "#EFEFEF", border: "none", boxShadow: "0 4px 20px rgba(220,38,38,0.3)" }}
            >
              Advance to Knockout Stage
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function MiniStandings({
  group,
  players,
}: {
  group: ReturnType<typeof useTournament>["state"]["tiebreakerGroups"][0];
  players: ReturnType<typeof useTournament>["state"]["players"];
}) {
  const relevantPlayers = players.filter((p) => group.playerIds.includes(p.id));
  const standings = computeStandings(relevantPlayers, group.matches);

  return (
    <div
      className="px-5 py-3"
      style={{ background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <p className="text-xs font-semibold mb-2" style={{ color: "rgba(239,239,239,0.4)" }}>
        Mini Standings
      </p>
      <div className="space-y-1">
        {standings.map((e, i) => (
          <div key={e.playerId} className="flex items-center justify-between text-xs">
            <span style={{ color: i === 0 ? "#EFEFEF" : "rgba(239,239,239,0.5)" }}>
              {i + 1}. {getPlayerName(players, e.playerId)}
            </span>
            <span style={{ color: i === 0 ? "#DC2626" : "rgba(239,239,239,0.4)" }}>
              {e.points} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
