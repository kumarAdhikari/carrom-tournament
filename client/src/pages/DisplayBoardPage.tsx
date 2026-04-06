// =============================================================================
// DISPLAY BOARD — External monitor /broadcast view (/display)
// Live-synced via TournamentContext + localStorage cross-tab
// =============================================================================

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ChevronRight, Crown, Monitor, Swords, Trophy, Zap } from "lucide-react";
import { PlayerFaceCircle } from "@/components/PlayerFaceCircle";
import { useTournament } from "@/contexts/TournamentContext";
import {
  computeStandings,
  FormLetter,
  getKnockoutCompletedSummaries,
  getLastKnockoutSummary,
  getLastLeagueHeadToHeadSummary,
  getRoundRobinLastMeetingLine,
  getLeagueFormLastN,
  getMatchLoser,
  getMatchWinner,
  getMutualLeagueOpponentResults,
  getPlayerAvatarUrl,
  getPlayerName,
  getRecentLeagueTickerItems,
  isLeagueComplete,
  KnockoutState,
  LeagueOutcome,
  LeagueTickerItem,
  Match,
  MutualLeagueOpponentRow,
  TiebreakerGroup,
} from "@/lib/tournament";

const OUTCOME_LABEL: Record<LeagueOutcome, string> = {
  win: "W",
  loss: "L",
  draw: "D",
};

function outcomeStyle(o: LeagueOutcome): CSSProperties {
  if (o === "win") return { color: "#22c55e", borderColor: "rgba(34,197,94,0.4)" };
  if (o === "loss") return { color: "rgba(239,239,239,0.35)", borderColor: "rgba(255,255,255,0.12)" };
  return { color: "#eab308", borderColor: "rgba(234,179,8,0.4)" };
}

function getKnockoutActiveStage(ko: KnockoutState): keyof KnockoutState | null {
  if (!ko.qualifier1?.result) return "qualifier1";
  if (!ko.eliminator?.result) return "eliminator";
  if (ko.qualifier2 && !ko.qualifier2.result) return "qualifier2";
  if (ko.final && !ko.final.result) return "final";
  return null;
}

const KO_LABELS: Record<string, string> = {
  qualifier1: "Qualifier 1",
  eliminator: "Eliminator",
  qualifier2: "Qualifier 2",
  final: "Grand Final",
};

function firstUnplayedTiebreakerMatch(state: ReturnType<typeof useTournament>["state"]): {
  groupIdx: number;
  match: Match;
} | null {
  for (let groupIdx = 0; groupIdx < state.tiebreakerGroups.length; groupIdx++) {
    const group = state.tiebreakerGroups[groupIdx];
    const m = group.matches.find((x) => x.result === null);
    if (m) return { groupIdx, match: m };
  }
  return null;
}

/** Next unplayed league fixture after `current` (round-robin order, wraps within unplayed set). */
function getUpcomingLeagueMatch(current: Match | null, leagueMatches: Match[]): Match | null {
  if (!current || leagueMatches.length === 0) return null;
  const curIdx = leagueMatches.findIndex((m) => m.id === current.id);
  if (curIdx === -1) return null;
  const unplayed = leagueMatches.filter((m) => m.result === null);
  const other = unplayed.filter((m) => m.id !== current.id);
  if (other.length === 0) return null;
  for (let i = curIdx + 1; i < leagueMatches.length; i++) {
    if (leagueMatches[i].result === null && leagueMatches[i].id !== current.id) {
      return leagueMatches[i];
    }
  }
  for (let i = 0; i < curIdx; i++) {
    if (leagueMatches[i].result === null) return leagueMatches[i];
  }
  return other[0] ?? null;
}

function listUnplayedTiebreakerMatches(state: ReturnType<typeof useTournament>["state"]): {
  groupIdx: number;
  match: Match;
}[] {
  const out: { groupIdx: number; match: Match }[] = [];
  for (let groupIdx = 0; groupIdx < state.tiebreakerGroups.length; groupIdx++) {
    const group = state.tiebreakerGroups[groupIdx];
    for (const m of group.matches) {
      if (m.result === null) out.push({ groupIdx, match: m });
    }
  }
  return out;
}

type UpcomingInfo = { line1: string; left: string; right: string };

function getKnockoutUpcoming(
  ko: KnockoutState,
  active: keyof KnockoutState | null,
  players: ReturnType<typeof useTournament>["state"]["players"]
): UpcomingInfo | null {
  if (!active || active === "champion" || active === "final") return null;

  const name = (id: string) => getPlayerName(players, id);

  if (active === "qualifier1") {
    const elim = ko.eliminator;
    if (elim && !elim.result) {
      return { line1: KO_LABELS.eliminator, left: name(elim.player1Id), right: name(elim.player2Id) };
    }
    return null;
  }

  if (active === "eliminator") {
    const q1 = ko.qualifier1;
    if (q1?.result) {
      const q1Loser = getMatchLoser(q1);
      if (q1Loser) {
        return {
          line1: "Qualifier 2 · On deck",
          left: name(q1Loser),
          right: "TBD",
        };
      }
    }
    if (q1 && !q1.result) {
      return { line1: KO_LABELS.qualifier1, left: name(q1.player1Id), right: name(q1.player2Id) };
    }
    return null;
  }

  if (active === "qualifier2") {
    const q1 = ko.qualifier1;
    if (q1?.result) {
      const q1Winner = getMatchWinner(q1);
      if (q1Winner) {
        return {
          line1: "Grand Final · On deck",
          left: name(q1Winner),
          right: "Winner of this game",
        };
      }
    }
    return { line1: KO_LABELS.final, left: "TBD", right: "TBD" };
  }

  return null;
}

function UpNextDock({
  upcoming,
  variant,
}: {
  upcoming: UpcomingInfo | null;
  variant: "league" | "tiebreaker" | "knockout" | "idle";
}) {
  if (!upcoming) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full overflow-hidden"
      style={{
        borderTop: "1px solid rgba(220,38,38,0.35)",
        background:
          "linear-gradient(180deg, rgba(220,38,38,0.14) 0%, rgba(10,10,10,0.96) 45%, rgba(8,8,8,1) 100%)",
        boxShadow: "0 -12px 40px rgba(220,38,38,0.08)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-60deg, transparent, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 4px)",
        }}
      />
      <div className="relative max-w-6xl mx-auto px-6 py-5 md:py-6 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-10">
        <div className="flex items-center gap-3 shrink-0">
          <motion.div
            className="px-3 py-1 rounded-md font-black text-[10px] md:text-xs tracking-[0.28em] uppercase"
            style={{
              background: "linear-gradient(135deg, #DC2626 0%, #7f1d1d 100%)",
              color: "#fff",
              boxShadow: "0 0 24px rgba(220,38,38,0.45)",
            }}
            animate={{ boxShadow: ["0 0 20px rgba(220,38,38,0.35)", "0 0 32px rgba(220,38,38,0.55)", "0 0 20px rgba(220,38,38,0.35)"] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            On deck
          </motion.div>
          <ChevronRight className="w-5 h-5 hidden sm:block" style={{ color: "rgba(239,239,239,0.25)" }} />
          <span className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase" style={{ color: "rgba(239,239,239,0.4)" }}>
            {variant === "league" && "League"}
            {variant === "tiebreaker" && "Tiebreaker"}
            {variant === "knockout" && "Knockout"}
          </span>
        </div>

        <div
          className="flex flex-wrap items-center justify-center gap-3 md:gap-6 text-center md:text-left"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          <span className="w-full md:w-auto text-xs md:text-sm font-semibold tracking-wide" style={{ color: "#DC2626" }}>
            {upcoming.line1}
          </span>
          <div className="flex items-center gap-3 md:gap-5">
            <span className="text-lg md:text-2xl font-bold" style={{ color: "#EFEFEF" }}>
              {upcoming.left}
            </span>
            <span
              className="text-sm md:text-base font-black italic px-2"
              style={{ color: "rgba(220,38,38,0.85)" }}
            >
              vs
            </span>
            <span className="text-lg md:text-2xl font-bold" style={{ color: "#EFEFEF" }}>
              {upcoming.right}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function formLetterStyle(letter: FormLetter): CSSProperties {
  if (letter === "W") return { color: "#22c55e", background: "rgba(34,197,94,0.12)" };
  if (letter === "L") return { color: "rgba(239,239,239,0.4)", background: "rgba(255,255,255,0.05)" };
  return { color: "#eab308", background: "rgba(234,179,8,0.12)" };
}

function HeroStatColumn({ label, stats }: { label: string; stats: { pts: number; w: number; d: number; l: number; form: FormLetter[] } }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-3 rounded-2xl border min-w-[140px] md:min-w-[180px]"
      style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.35)" }}
    >
      <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "rgba(239,239,239,0.45)" }}>
        {label}
      </span>
      <span className="text-2xl md:text-3xl font-black font-mono" style={{ color: "#DC2626" }}>
        {stats.pts}
        <span className="text-xs font-sans font-semibold ml-1" style={{ color: "rgba(239,239,239,0.35)" }}>
          pts
        </span>
      </span>
      <div className="flex gap-2 text-[10px] md:text-xs font-mono" style={{ color: "rgba(239,239,239,0.55)" }}>
        <span>{stats.w}W</span>
        <span>{stats.d}D</span>
        <span>{stats.l}L</span>
      </div>
      {stats.form.length > 0 && (
        <div className="flex gap-1 mt-1">
          {stats.form.map((letter, i) => (
            <span
              key={i}
              className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black"
              style={formLetterStyle(letter)}
            >
              {letter}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StandingsRail({
  players,
  leagueMatches,
}: {
  players: ReturnType<typeof useTournament>["state"]["players"];
  leagueMatches: Match[];
}) {
  const standings = useMemo(() => computeStandings(players, leagueMatches), [players, leagueMatches]);
  if (standings.length === 0) return null;

  const top = standings.slice(0, 8);

  return (
    <div
      className="shrink-0 border-b overflow-x-auto overflow-y-hidden"
      style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(8,8,8,0.85)" }}
    >
      <LayoutGroup>
        <div className="flex items-stretch gap-2 px-4 py-3 min-w-max">
          <span
            className="hidden md:flex items-center text-[10px] font-black tracking-[0.2em] uppercase pr-2 shrink-0"
            style={{ color: "rgba(239,239,239,0.35)" }}
          >
            Table
          </span>
          {top.map((row) => (
            <motion.div
              layout
              key={row.playerId}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border shrink-0"
              style={{
                borderColor: row.rank === 1 ? "rgba(220,38,38,0.35)" : "rgba(255,255,255,0.08)",
                background: row.rank === 1 ? "rgba(220,38,38,0.1)" : "rgba(255,255,255,0.04)",
              }}
            >
              <motion.span layout className="text-xs font-black w-6 text-center font-mono" style={{ color: "#DC2626" }}>
                {row.rank}
              </motion.span>
              <span className="text-sm font-semibold whitespace-nowrap max-w-[120px] md:max-w-[160px] truncate" style={{ color: "#EFEFEF" }}>
                {getPlayerName(players, row.playerId)}
              </span>
              <span className="text-xs font-mono font-bold" style={{ color: "rgba(239,239,239,0.65)" }}>
                {row.points}pts
              </span>
            </motion.div>
          ))}
        </div>
      </LayoutGroup>
    </div>
  );
}

function LeagueTickerBar({ items }: { items: LeagueTickerItem[] }) {
  if (items.length === 0) return null;

  return (
    <div
      className="shrink-0 overflow-hidden border-b flex items-center h-10 md:h-11"
      style={{
        borderColor: "rgba(220,38,38,0.18)",
        background: "linear-gradient(90deg, rgba(220,38,38,0.08), rgba(0,0,0,0.5), rgba(220,38,38,0.08))",
      }}
    >
      <span
        className="shrink-0 pl-4 pr-3 text-[10px] font-black tracking-[0.25em] uppercase z-10"
        style={{ color: "rgba(239,239,239,0.5)" }}
      >
        Latest
      </span>
      <div className="flex-1 overflow-hidden min-w-0 relative">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: Math.max(28, items.length * 6), repeat: Infinity, ease: "linear" }}
          style={{ width: "max-content" }}
        >
          <div className="flex items-center gap-10 pr-10">
            {items.map((item) => (
              <span key={item.id} className="text-xs md:text-sm font-medium shrink-0" style={{ color: "rgba(239,239,239,0.75)" }}>
                {item.label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-10 pr-10" aria-hidden>
            {items.map((item) => (
              <span key={`dup-${item.id}`} className="text-xs md:text-sm font-medium shrink-0" style={{ color: "rgba(239,239,239,0.75)" }}>
                {item.label}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function MicroBracketStrip({ ko, active }: { ko: KnockoutState; active: keyof KnockoutState | null }) {
  const steps: { key: keyof KnockoutState; short: string }[] = [
    { key: "qualifier1", short: "Q1" },
    { key: "eliminator", short: "ELIM" },
    { key: "qualifier2", short: "Q2" },
    { key: "final", short: "FINAL" },
  ];

  return (
    <div
      className="shrink-0 flex items-center justify-center gap-2 md:gap-4 px-4 py-3 border-b"
      style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(15,15,15,0.9)" }}
    >
      {steps.map(({ key, short }, i) => {
        const m = ko[key] as Match | undefined;
        const hasMatch = m && typeof m !== "string";
        const done = !!(hasMatch && m.result !== null);
        const live = !!(hasMatch && m.result === null && active === key);

        return (
          <div key={String(key)} className="flex items-center gap-2 md:gap-4">
            {i > 0 && <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "rgba(239,239,239,0.15)" }} />}
            <div
              className="px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black tracking-wider"
              style={{
                color: done ? "#22c55e" : live ? "#fff" : "rgba(239,239,239,0.35)",
                background: done ? "rgba(34,197,94,0.12)" : live ? "rgba(220,38,38,0.3)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${done ? "rgba(34,197,94,0.35)" : live ? "rgba(220,38,38,0.6)" : "rgba(255,255,255,0.08)"}`,
                boxShadow: live ? "0 0 20px rgba(220,38,38,0.25)" : undefined,
              }}
            >
              {short}
              {done && " ✓"}
              {live && " ●"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KnockoutStoryStrip({
  players,
  ko,
  champion,
}: {
  players: ReturnType<typeof useTournament>["state"]["players"];
  ko: KnockoutState;
  champion: string | undefined;
}) {
  const summaries = useMemo(() => getKnockoutCompletedSummaries(players, ko), [players, ko]);
  const last = useMemo(() => getLastKnockoutSummary(players, ko), [players, ko]);
  const earlier = useMemo(() => (summaries.length > 1 ? summaries.slice(0, -1) : []), [summaries]);

  if (summaries.length === 0 && !champion) {
    return (
      <div
        className="shrink-0 px-6 py-3 border-b text-center text-sm md:text-base"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          background: "rgba(220,38,38,0.06)",
          color: "rgba(239,239,239,0.5)",
        }}
      >
        Knockout bracket live — first result incoming
      </div>
    );
  }

  return (
    <div
      className="shrink-0 border-b px-6 py-4 md:py-5"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(20,20,20,0.98) 0%, rgba(10,10,10,0.95) 100%)",
      }}
    >
      {champion ? (
        <div className="max-w-5xl mx-auto text-center mb-4">
          <p className="text-[10px] md:text-xs font-black tracking-[0.3em] uppercase mb-2" style={{ color: "rgba(239,239,239,0.45)" }}>
            Tournament champion
          </p>
          <p
            className="text-2xl md:text-4xl font-black"
            style={{ fontFamily: "'Playfair Display', serif", color: "#EFEFEF" }}
          >
            {getPlayerName(players, champion)}
          </p>
        </div>
      ) : null}

      {!champion && last ? (
        <div className="max-w-5xl mx-auto text-center mb-3">
          <p className="text-[10px] md:text-xs font-black tracking-[0.28em] uppercase mb-2" style={{ color: "#DC2626" }}>
            Last knockout result
          </p>
          <p
            className="text-lg md:text-2xl font-bold leading-snug"
            style={{ fontFamily: "'Playfair Display', serif", color: "#EFEFEF" }}
          >
            {last.line}
          </p>
        </div>
      ) : null}

      {champion && summaries.length > 0 ? (
        <p className="text-center text-[10px] font-black tracking-[0.25em] uppercase mb-2" style={{ color: "rgba(239,239,239,0.4)" }}>
          Road to the title
        </p>
      ) : earlier.length > 0 ? (
        <p className="text-center text-[10px] font-black tracking-[0.25em] uppercase mb-2" style={{ color: "rgba(239,239,239,0.4)" }}>
          Earlier tonight
        </p>
      ) : null}

      {(champion ? summaries : earlier).length > 0 ? (
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-2 md:gap-3">
          {(champion ? summaries : earlier).map((row) => (
            <div
              key={row.stageKey}
              className="px-3 py-2 rounded-xl text-xs md:text-sm max-w-[340px] text-center"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(239,239,239,0.8)",
              }}
            >
              {row.line}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TiebreakerMiniTable({
  group,
  players,
}: {
  group: TiebreakerGroup;
  players: ReturnType<typeof useTournament>["state"]["players"];
}) {
  const subPlayers = useMemo(() => players.filter((p) => group.playerIds.includes(p.id)), [players, group.playerIds]);
  const mini = useMemo(() => computeStandings(subPlayers, group.matches), [subPlayers, group.matches]);

  return (
    <div
      className="mt-8 w-full max-w-xl mx-auto rounded-2xl border overflow-hidden"
      style={{ borderColor: "rgba(220,38,38,0.25)", background: "rgba(0,0,0,0.45)" }}
    >
      <div
        className="px-4 py-2 text-center text-[10px] font-black tracking-[0.2em] uppercase"
        style={{ background: "rgba(220,38,38,0.15)", color: "rgba(239,239,239,0.55)" }}
      >
        Tiebreaker table · Position {group.position}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: "rgba(239,239,239,0.4)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <th className="text-left py-2 pl-4 font-semibold">#</th>
            <th className="text-left py-2 font-semibold">Player</th>
            <th className="text-right py-2 pr-4 font-mono">Pts</th>
          </tr>
        </thead>
        <tbody>
          {mini.map((row) => (
            <tr key={row.playerId} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <td className="py-2 pl-4 font-mono" style={{ color: "#DC2626" }}>
                {row.rank}
              </td>
              <td className="py-2 font-medium" style={{ color: "#EFEFEF" }}>
                {getPlayerName(players, row.playerId)}
              </td>
              <td className="py-2 pr-4 text-right font-mono font-bold">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChampionConfetti({ active }: { active: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        i,
        left: `${(i * 7.3) % 100}%`,
        delay: (i % 12) * 0.04,
        duration: 2.8 + (i % 5) * 0.15,
        hue: i % 2 === 0 ? "#DC2626" : "#fbbf24",
      })),
    []
  );

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.div
          key={p.i}
          className="absolute w-2 h-3 rounded-[1px] top-0"
          style={{ left: p.left, background: p.hue }}
          initial={{ y: "-5vh", opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", opacity: [1, 1, 0], rotate: 360 * (1 + (p.i % 3)) }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}

function MutualIntelStrip({
  rows,
  players,
  p1Name,
  p2Name,
}: {
  rows: MutualLeagueOpponentRow[];
  players: ReturnType<typeof useTournament>["state"]["players"];
  p1Name: string;
  p2Name: string;
}) {
  if (rows.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 w-full max-w-5xl px-8"
    >
      <div
        className="rounded-2xl px-6 py-4 border"
        style={{
          background: "rgba(220,38,38,0.06)",
          borderColor: "rgba(220,38,38,0.25)",
        }}
      >
        <div className="flex items-center gap-2 mb-3 justify-center">
          <Zap className="w-5 h-5" style={{ color: "#DC2626" }} />
          <span
            className="text-sm font-bold tracking-[0.2em] uppercase"
            style={{ color: "rgba(239,239,239,0.55)" }}
          >
            Common foes
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {rows.map((row) => (
            <div
              key={row.opponentId}
              className="rounded-xl px-4 py-3 border text-center min-w-[200px]"
              style={{ background: "rgba(0,0,0,0.35)", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "rgba(239,239,239,0.45)" }}>
                vs {getPlayerName(players, row.opponentId)}
              </div>
              <div className="flex items-center justify-center gap-4 text-sm font-semibold">
                <span style={{ color: "#EFEFEF" }}>
                  {p1Name}{" "}
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border ml-1 font-black"
                    style={outcomeStyle(row.p1Outcome)}
                  >
                    {OUTCOME_LABEL[row.p1Outcome]}
                  </span>
                </span>
                <span style={{ color: "rgba(239,239,239,0.25)" }}>|</span>
                <span style={{ color: "#EFEFEF" }}>
                  {p2Name}{" "}
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border ml-1 font-black"
                    style={outcomeStyle(row.p2Outcome)}
                  >
                    {OUTCOME_LABEL[row.p2Outcome]}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

type HeroStatBundle = { pts: number; w: number; d: number; l: number; form: FormLetter[] };

function MatchupHero({
  leftName,
  rightName,
  leftAvatarUrl,
  rightAvatarUrl,
  sublabel,
  mutualRows,
  players,
  statBlock,
  heroExtra,
  headToHeadLine,
}: {
  leftName: string;
  rightName: string;
  leftAvatarUrl?: string | null;
  rightAvatarUrl?: string | null;
  sublabel: string;
  mutualRows: MutualLeagueOpponentRow[];
  players: ReturnType<typeof useTournament>["state"]["players"];
  statBlock?: { left: HeroStatBundle; right: HeroStatBundle } | null;
  heroExtra?: ReactNode;
  headToHeadLine?: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, x: 80 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.92, x: -80 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center flex-1 w-full px-6"
    >
      <p
        className="text-sm md:text-base tracking-[0.35em] uppercase mb-6"
        style={{ color: "rgba(239,239,239,0.45)" }}
      >
        {sublabel}
      </p>
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 w-full max-w-6xl">
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
        >
          <PlayerFaceCircle
            name={leftName}
            avatarUrl={leftAvatarUrl}
            tone="luxLight"
            className="mb-4 h-28 w-28 text-4xl md:h-36 md:w-36 md:text-6xl"
          />
          <h2
            className="text-4xl md:text-6xl lg:text-7xl font-black text-center leading-tight"
            style={{ fontFamily: "'Playfair Display', serif", color: "#EFEFEF" }}
          >
            {leftName}
          </h2>
        </motion.div>

        <motion.div
          className="text-5xl md:text-7xl font-black italic px-4"
          style={{
            fontFamily: "'Playfair Display', serif",
            color: "#DC2626",
            textShadow: "0 0 40px rgba(220,38,38,0.35)",
          }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          VS
        </motion.div>

        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <PlayerFaceCircle
            name={rightName}
            avatarUrl={rightAvatarUrl}
            tone="luxDark"
            className="mb-4 h-28 w-28 text-4xl md:h-36 md:w-36 md:text-6xl"
          />
          <h2
            className="text-4xl md:text-6xl lg:text-7xl font-black text-center leading-tight"
            style={{ fontFamily: "'Playfair Display', serif", color: "#EFEFEF" }}
          >
            {rightName}
          </h2>
        </motion.div>
      </div>

      {headToHeadLine ? (
        <p
          className="mt-8 text-center text-sm md:text-base font-medium max-w-3xl px-4 rounded-xl py-3 border"
          style={{
            color: "rgba(239,239,239,0.72)",
            borderColor: "rgba(255,255,255,0.1)",
            background: "rgba(220,38,38,0.06)",
          }}
        >
          {headToHeadLine}
        </p>
      ) : null}

      {statBlock && (
        <div className="flex flex-wrap justify-center gap-6 md:gap-10 mt-8 w-full max-w-4xl">
          <HeroStatColumn label={leftName} stats={statBlock.left} />
          <HeroStatColumn label={rightName} stats={statBlock.right} />
        </div>
      )}

      {heroExtra}

      <MutualIntelStrip rows={mutualRows} players={players} p1Name={leftName} p2Name={rightName} />
    </motion.div>
  );
}

export default function DisplayBoardPage() {
  const { state } = useTournament();
  const { players, leagueMatches, tiebreakerGroups, knockoutState, stage, currentMatchIndex } = state;

  const standings = computeStandings(players, leagueMatches);
  const leagueComplete = isLeagueComplete(leagueMatches);
  const completedLeague = leagueMatches.filter((m) => m.result !== null).length;
  const leagueTotal = leagueMatches.length;
  const leagueProgress = leagueTotal ? (completedLeague / leagueTotal) * 100 : 0;

  const currentLeagueMatch =
    stage === "league"
      ? leagueMatches[currentMatchIndex] ?? leagueMatches.find((m) => m.result === null)
      : null;

  const mutualRows =
    currentLeagueMatch && !currentLeagueMatch.result
      ? getMutualLeagueOpponentResults(
          currentLeagueMatch.player1Id,
          currentLeagueMatch.player2Id,
          leagueMatches
        )
      : [];

  const tbNext = stage === "tiebreaker" ? firstUnplayedTiebreakerMatch(state) : null;
  const koActive = stage === "knockout" || stage === "complete" ? getKnockoutActiveStage(knockoutState) : null;
  const koMatch =
    koActive && knockoutState[koActive] && typeof knockoutState[koActive] !== "string"
      ? (knockoutState[koActive] as Match)
      : null;
  const champion = knockoutState.champion;

  const tickerItems = useMemo(
    () => getRecentLeagueTickerItems(players, leagueMatches, 14),
    [players, leagueMatches]
  );

  const leagueHeroStatBlock = useMemo(() => {
    if (stage !== "league" || !currentLeagueMatch || currentLeagueMatch.result) return null;
    const s = computeStandings(players, leagueMatches);
    const le = s.find((e) => e.playerId === currentLeagueMatch.player1Id);
    const ri = s.find((e) => e.playerId === currentLeagueMatch.player2Id);
    if (!le || !ri) return null;
    return {
      left: {
        pts: le.points,
        w: le.won,
        d: le.drawn,
        l: le.lost,
        form: getLeagueFormLastN(currentLeagueMatch.player1Id, leagueMatches, 3),
      },
      right: {
        pts: ri.points,
        w: ri.won,
        d: ri.drawn,
        l: ri.lost,
        form: getLeagueFormLastN(currentLeagueMatch.player2Id, leagueMatches, 3),
      },
    };
  }, [stage, currentLeagueMatch, players, leagueMatches]);

  const leagueHeadToHead = useMemo(() => {
    if (stage !== "league" || !currentLeagueMatch || currentLeagueMatch.result) return null;
    return getLastLeagueHeadToHeadSummary(
      players,
      leagueMatches,
      currentLeagueMatch.player1Id,
      currentLeagueMatch.player2Id
    );
  }, [stage, currentLeagueMatch, players, leagueMatches]);

  const knockoutHeadToHead = useMemo(() => {
    if ((stage !== "knockout" && stage !== "complete") || !koMatch || koMatch.result) return null;
    return getRoundRobinLastMeetingLine(
      players,
      leagueMatches,
      koMatch.player1Id,
      koMatch.player2Id
    );
  }, [stage, koMatch, players, leagueMatches]);

  const stateSnap = useMemo(() => JSON.stringify(state), [state]);
  const snapRef = useRef<string | null>(null);
  const [syncPulse, setSyncPulse] = useState(false);
  useEffect(() => {
    if (snapRef.current !== null && snapRef.current !== stateSnap) {
      setSyncPulse(true);
      const t = window.setTimeout(() => setSyncPulse(false), 320);
      snapRef.current = stateSnap;
      return () => window.clearTimeout(t);
    }
    snapRef.current = stateSnap;
  }, [stateSnap]);

  const mountedRef = useRef(false);
  const prevChampRef = useRef<string | undefined>(undefined);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiBurst, setConfettiBurst] = useState(0);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevChampRef.current = champion ?? undefined;
      return;
    }
    if (champion && champion !== prevChampRef.current) {
      prevChampRef.current = champion;
      setConfettiBurst((k) => k + 1);
      setShowConfetti(true);
      const t = window.setTimeout(() => setShowConfetti(false), 5000);
      return () => window.clearTimeout(t);
    }
    if (!champion) prevChampRef.current = undefined;
  }, [champion]);

  let transitionKey = "idle";
  let body: ReactNode = null;

  if (stage === "setup") {
    transitionKey = "setup";
    body = (
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center flex-1 gap-6 px-8"
      >
        <Monitor className="w-16 h-16" style={{ color: "rgba(239,239,239,0.25)" }} />
        <h1
          className="text-4xl md:text-6xl font-black text-center"
          style={{ fontFamily: "'Playfair Display', serif", color: "#EFEFEF" }}
        >
          Carrom Tournament
        </h1>
        <p className="text-lg md:text-xl text-center max-w-xl" style={{ color: "rgba(239,239,239,0.45)" }}>
          Display board ready. Start or resume the tournament from the control screen.
        </p>
      </motion.div>
    );
  } else if (stage === "league") {
    if (leagueComplete) {
      transitionKey = "league-complete";
      body = (
        <motion.div
          key={transitionKey}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex flex-col items-center justify-center flex-1 gap-4"
        >
          <Trophy className="w-20 h-20" style={{ color: "#DC2626" }} />
          <h2
            className="text-5xl md:text-7xl font-black"
            style={{ fontFamily: "'Playfair Display', serif", color: "#EFEFEF" }}
          >
            League complete
          </h2>
          <p className="text-xl" style={{ color: "rgba(239,239,239,0.5)" }}>
            Awaiting knockout on control station
          </p>
        </motion.div>
      );
    } else if (currentLeagueMatch && !currentLeagueMatch.result) {
      transitionKey = `league-${currentLeagueMatch.id}`;
      const p1 = getPlayerName(players, currentLeagueMatch.player1Id);
      const p2 = getPlayerName(players, currentLeagueMatch.player2Id);
      body = (
        <MatchupHero
          key={transitionKey}
          leftName={p1}
          rightName={p2}
          leftAvatarUrl={getPlayerAvatarUrl(players, currentLeagueMatch.player1Id)}
          rightAvatarUrl={getPlayerAvatarUrl(players, currentLeagueMatch.player2Id)}
          sublabel={`League match ${completedLeague + 1} of ${leagueTotal}`}
          mutualRows={mutualRows}
          players={players}
          statBlock={leagueHeroStatBlock}
          headToHeadLine={leagueHeadToHead}
        />
      );
    } else {
      transitionKey = "league-wait";
      body = (
        <motion.div
          key={transitionKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex-1 flex items-center justify-center"
        >
          <p className="text-2xl" style={{ color: "rgba(239,239,239,0.5)" }}>
            Select a match on control
          </p>
        </motion.div>
      );
    }
  } else if (stage === "tiebreaker") {
    if (tbNext) {
      const { groupIdx, match } = tbNext;
      const group = tiebreakerGroups[groupIdx];
      const p1 = getPlayerName(players, match.player1Id);
      const p2 = getPlayerName(players, match.player2Id);
      transitionKey = `tb-${match.id}`;
      body = (
        <MatchupHero
          key={transitionKey}
          leftName={p1}
          rightName={p2}
          leftAvatarUrl={getPlayerAvatarUrl(players, match.player1Id)}
          rightAvatarUrl={getPlayerAvatarUrl(players, match.player2Id)}
          sublabel={`Tiebreaker · Position ${group.position} · Mini league`}
          mutualRows={[]}
          players={players}
          heroExtra={<TiebreakerMiniTable group={group} players={players} />}
        />
      );
    } else {
      transitionKey = "tb-wait";
      body = (
        <motion.div
          key={transitionKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center flex-1 gap-4"
        >
          <Swords className="w-16 h-16" style={{ color: "#DC2626" }} />
          <h2 className="text-5xl font-black" style={{ fontFamily: "'Playfair Display', serif", color: "#EFEFEF" }}>
            Tiebreaker
          </h2>
          <p className="text-xl" style={{ color: "rgba(239,239,239,0.45)" }}>
            Round complete — continue on control
          </p>
        </motion.div>
      );
    }
  } else if (stage === "knockout" || stage === "complete") {
    if (champion) {
      transitionKey = `champion-${champion}`;
      body = (
        <motion.div
          key={transitionKey}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center flex-1 gap-6"
        >
          <motion.div animate={{ rotate: [0, -6, 6, -6, 0] }} transition={{ duration: 0.6, delay: 0.2 }}>
            <Crown className="w-24 h-24 md:w-32 md:h-32" style={{ color: "#DC2626" }} />
          </motion.div>
          <p className="text-sm tracking-[0.4em] uppercase" style={{ color: "rgba(239,239,239,0.5)" }}>
            Champion
          </p>
          <h2
            className="text-5xl md:text-8xl font-black text-center px-4"
            style={{ fontFamily: "'Playfair Display', serif", color: "#EFEFEF" }}
          >
            {getPlayerName(players, champion)}
          </h2>
        </motion.div>
      );
    } else if (koMatch && koActive) {
      transitionKey = `ko-${koActive}-${koMatch.id}`;
      const p1 = getPlayerName(players, koMatch.player1Id);
      const p2 = getPlayerName(players, koMatch.player2Id);
      body = (
        <MatchupHero
          key={transitionKey}
          leftName={p1}
          rightName={p2}
          leftAvatarUrl={getPlayerAvatarUrl(players, koMatch.player1Id)}
          rightAvatarUrl={getPlayerAvatarUrl(players, koMatch.player2Id)}
          sublabel={KO_LABELS[koActive] ?? koActive}
          mutualRows={[]}
          players={players}
          headToHeadLine={knockoutHeadToHead}
        />
      );
    } else {
      transitionKey = "ko-wait";
      body = (
        <motion.div
          key={transitionKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex-1 flex items-center justify-center"
        >
          <p className="text-2xl" style={{ color: "rgba(239,239,239,0.5)" }}>
            Bracket updating…
          </p>
        </motion.div>
      );
    }
  }

  const headerStage =
    stage === "setup"
      ? "Display"
      : stage === "league"
        ? "League"
        : stage === "tiebreaker"
          ? "Tiebreaker"
          : stage === "complete"
            ? "Final"
            : "Knockout";

  let footerUpcoming: UpcomingInfo | null = null;
  let footerVariant: "league" | "tiebreaker" | "knockout" | "idle" = "idle";

  if (stage === "league" && currentLeagueMatch && !currentLeagueMatch.result && !leagueComplete) {
    const nextLm = getUpcomingLeagueMatch(currentLeagueMatch, leagueMatches);
    if (nextLm) {
      const idx = leagueMatches.findIndex((m) => m.id === nextLm.id);
      footerUpcoming = {
        line1: `Fixture ${idx + 1} of ${leagueTotal}`,
        left: getPlayerName(players, nextLm.player1Id),
        right: getPlayerName(players, nextLm.player2Id),
      };
      footerVariant = "league";
    }
  } else if (stage === "tiebreaker" && tbNext) {
    const tbList = listUnplayedTiebreakerMatches(state);
    const curPos = tbList.findIndex((x) => x.match.id === tbNext.match.id);
    const nextTb = curPos >= 0 ? tbList[curPos + 1] : null;
    if (nextTb) {
      const g = tiebreakerGroups[nextTb.groupIdx];
      footerUpcoming = {
        line1: `Position ${g.position} · next pairing`,
        left: getPlayerName(players, nextTb.match.player1Id),
        right: getPlayerName(players, nextTb.match.player2Id),
      };
      footerVariant = "tiebreaker";
    }
  } else if ((stage === "knockout" || stage === "complete") && !champion && koActive) {
    const koUp = getKnockoutUpcoming(knockoutState, koActive, players);
    if (koUp) {
      footerUpcoming = koUp;
      footerVariant = "knockout";
    }
  }

  const footerPresenceKey = footerUpcoming
    ? `${footerVariant}-${footerUpcoming.line1}-${footerUpcoming.left}-${footerUpcoming.right}`
    : "empty";

  const showStandingsRail = stage !== "setup" && players.length > 0;
  const showTicker =
    stage !== "setup" &&
    stage !== "knockout" &&
    stage !== "complete" &&
    tickerItems.length > 0;
  const showMicroBracket = (stage === "knockout" || stage === "complete") && !champion;
  const showKnockoutStory = stage === "knockout" || stage === "complete";

  return (
    <motion.div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% -20%, rgba(220,38,38,0.12), transparent 50%), #0a0a0a",
      }}
      animate={
        syncPulse
          ? { boxShadow: "inset 0 0 0 3px rgba(220,38,38,0.7)" }
          : { boxShadow: "inset 0 0 0 0px rgba(0,0,0,0)" }
      }
      transition={{ duration: 0.18 }}
    >
      <ChampionConfetti key={confettiBurst} active={showConfetti} />
      <header
        className="shrink-0 px-8 py-5 flex items-center justify-between border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(13,13,13,0.92)" }}
      >
        <div className="flex items-center gap-4">
          <div
            className="h-2 w-2 rounded-full animate-pulse"
            style={{ background: "#22c55e", boxShadow: "0 0 12px #22c55e" }}
          />
          <span className="text-xs font-bold tracking-[0.25em] uppercase" style={{ color: "rgba(239,239,239,0.5)" }}>
            Live
          </span>
          <span className="text-lg md:text-xl font-bold" style={{ color: "#EFEFEF" }}>
            {headerStage}
          </span>
        </div>
        {stage === "league" && leagueTotal > 0 && (
          <div className="hidden sm:block flex-1 max-w-md mx-8">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #DC2626, #991B1B)" }}
                initial={false}
                animate={{ width: `${leagueProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="text-right text-xs mt-1" style={{ color: "rgba(239,239,239,0.35)" }}>
              {completedLeague}/{leagueTotal} matches
            </div>
          </div>
        )}
        {stage === "league" && standings[0] && (
          <div className="text-right text-sm md:text-base" style={{ color: "rgba(239,239,239,0.6)" }}>
            <span className="text-xs uppercase tracking-wider mr-2" style={{ color: "rgba(239,239,239,0.35)" }}>
              Leader
            </span>
            <span className="font-semibold" style={{ color: "#EFEFEF" }}>
              {getPlayerName(players, standings[0].playerId)}
            </span>
            <span className="ml-2 font-mono" style={{ color: "#DC2626" }}>
              {standings[0].points} pts
            </span>
          </div>
        )}
      </header>

      {showStandingsRail ? <StandingsRail players={players} leagueMatches={leagueMatches} /> : null}
      {showMicroBracket ? (
        <MicroBracketStrip ko={knockoutState} active={koActive} />
      ) : null}
      {showKnockoutStory ? (
        <KnockoutStoryStrip players={players} ko={knockoutState} champion={champion} />
      ) : null}
      {showTicker ? <LeagueTickerBar items={tickerItems} /> : null}

      <main className="flex-1 flex flex-col min-h-0 relative">
        <AnimatePresence mode="wait">{body}</AnimatePresence>
      </main>

      {footerUpcoming ? (
        <footer className="shrink-0 mt-auto">
          <AnimatePresence mode="wait">
            <UpNextDock key={footerPresenceKey} upcoming={footerUpcoming} variant={footerVariant} />
          </AnimatePresence>
        </footer>
      ) : null}
    </motion.div>
  );
}
