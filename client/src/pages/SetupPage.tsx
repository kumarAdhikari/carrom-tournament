// =============================================================================
// CARROM TOURNAMENT — Setup Page (Player Registration)
// Design: Dark Luxury Sports | Playfair Display headings | DM Sans body
// Colors: bg-[#111111] | card-[#1C1C1C] | accent-red-600 | text-[#EFEFEF]
// =============================================================================

import { useRef, useState, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePlus, Plus, Trash2, Trophy, Upload, Users, Shuffle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseTournamentBackupJson, useTournament } from "@/contexts/TournamentContext";
import { imageFileToStoredAvatarUrl } from "@/lib/imageCompress";
import type { PlayerSeed } from "@/lib/tournament";
import { BROWSER_LOCAL_ONLY } from "@/lib/runtimeConfig";

const HERO_IMAGE = BROWSER_LOCAL_ONLY
  ? null
  : "https://d2xsxph8kpxj0f.cloudfront.net/310519663520936534/dGSgQU9Fiuj7sPUNP9JTix/carrom-hero-SAWqdCdjNrmTHUiG4HuFcV.webp";
const DISC_PATTERN = BROWSER_LOCAL_ONLY
  ? null
  : "https://d2xsxph8kpxj0f.cloudfront.net/310519663520936534/dGSgQU9Fiuj7sPUNP9JTix/carrom-disc-pattern-SZZTNYrGyKx4XkCGKqDT29.webp";

const SAMPLE_NAMES = ["Arjun", "Priya", "Rahul", "Sneha", "Vikram", "Meera", "Kiran", "Rohan"];

type SetupRow = { name: string; avatarUrl?: string };

export default function SetupPage() {
  const { initTournamentAction, restoreTournamentFromBackup } = useTournament();
  const [rows, setRows] = useState<SetupRow[]>([{ name: "" }, { name: "" }, { name: "" }, { name: "" }]);
  const [error, setError] = useState<string>("");
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [restoreNotice, setRestoreNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const addPlayer = () => {
    setRows((prev) => [...prev, { name: "" }]);
    setError("");
  };

  const removePlayer = (index: number) => {
    if (rows.length <= 4) {
      setError("Minimum 4 players required.");
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
    setError("");
  };

  const updatePlayerName = (index: number, value: string) => {
    setRows((prev) => prev.map((p, i) => (i === index ? { ...p, name: value } : p)));
    setError("");
  };

  const setPlayerAvatar = (index: number, dataUrl: string | undefined) => {
    setRows((prev) => prev.map((p, i) => (i === index ? { ...p, avatarUrl: dataUrl } : p)));
    setError("");
  };

  const onAvatarFile = async (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setError("");
    try {
      const url = await imageFileToStoredAvatarUrl(file);
      setPlayerAvatar(index, url);
    } catch {
      setError("Could not use that image. Try another file or a smaller photo.");
    }
  };

  const fillSampleNames = () => {
    const shuffled = [...SAMPLE_NAMES].sort(() => Math.random() - 0.5);
    const n = Math.max(rows.length, 4);
    const next: SetupRow[] = [];
    for (let i = 0; i < n; i++) {
      next.push({ name: shuffled[i % shuffled.length] ?? `Player ${i + 1}` });
    }
    setRows(next);
    setError("");
  };

  const handleGenerate = () => {
    const seeds: PlayerSeed[] = rows
      .map((r) => {
        const name = r.name.trim();
        if (!name) return null;
        const s: PlayerSeed = { name };
        if (r.avatarUrl) s.avatarUrl = r.avatarUrl;
        return s;
      })
      .filter((s): s is PlayerSeed => s !== null);
    if (seeds.length < 4) {
      setError("Please enter at least 4 player names.");
      return;
    }
    const unique = new Set(seeds.map((s) => s.name.toLowerCase()));
    if (unique.size !== seeds.length) {
      setError("Player names must be unique.");
      return;
    }
    initTournamentAction(seeds);
  };

  const onRestoreFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setRestoreNotice(null);
    setError("");
    try {
      const text = await file.text();
      const next = parseTournamentBackupJson(text);
      if (!next) {
        setRestoreNotice({
          tone: "err",
          text: "Not a valid Carrom backup (wrong version or corrupted file).",
        });
        return;
      }
      if (
        !window.confirm(
          "Load this tournament on this computer? You’ll get the same players, photos, and all saved results. Replace anything currently on this site for this browser."
        )
      ) {
        return;
      }
      restoreTournamentFromBackup(next);
    } catch {
      setRestoreNotice({ tone: "err", text: "Could not read that file." });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#0D0D0D" }}>
      {/* Background hero image */}
      {HERO_IMAGE && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
      )}
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

      {/* Decorative disc pattern — right side */}
      {DISC_PATTERN && (
        <div
          className="absolute right-0 top-0 w-1/3 h-full opacity-5 bg-cover bg-center"
          style={{ backgroundImage: `url(${DISC_PATTERN})` }}
        />
      )}

      {/* Floating decorative discs */}
      <div className="absolute top-20 left-8 w-16 h-16 carrom-disc-white carrom-disc opacity-20 blur-sm" />
      <div className="absolute top-40 left-24 w-10 h-10 carrom-disc opacity-15 blur-sm" />
      <div className="absolute bottom-32 right-16 w-20 h-20 carrom-disc-white carrom-disc opacity-15 blur-sm" />
      <div className="absolute bottom-16 right-40 w-12 h-12 carrom-disc-red carrom-disc opacity-30" />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 carrom-disc-red carrom-disc" />
            <Trophy className="w-8 h-8 text-red-500" />
            <div className="w-8 h-8 carrom-disc-white carrom-disc" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-3" style={{ fontFamily: "'Playfair Display', serif", color: "#EFEFEF" }}>
            Carrom
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-[0.3em] uppercase mb-4" style={{ fontFamily: "'DM Sans', sans-serif", color: "#DC2626" }}>
            Tournament
          </h2>
          <p className="text-sm tracking-widest uppercase" style={{ color: "rgba(239,239,239,0.45)", fontFamily: "'DM Sans', sans-serif" }}>
            League · Knockout · Champion
          </p>
        </motion.div>

        {/* Setup Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-lg"
        >
          <div
            className="rounded-2xl border p-8"
            style={{
              background: "rgba(28,28,28,0.85)",
              backdropFilter: "blur(20px)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            {/* Card header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "#EFEFEF" }}>
                  Players
                </h3>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(220,38,38,0.15)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.3)" }}
                >
                  min 4
                </span>
              </div>
              <button
                onClick={fillSampleNames}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-105"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(239,239,239,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Shuffle className="w-3 h-3" />
                Sample names
              </button>
            </div>

            {/* Player inputs */}
            <div className="space-y-3 mb-5">
              <AnimatePresence>
                {rows.map((row, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-2"
                  >
                    {/* Rank disc */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: index < 4 ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${index < 4 ? "rgba(220,38,38,0.3)" : "rgba(255,255,255,0.1)"}`,
                        color: index < 4 ? "#DC2626" : "rgba(239,239,239,0.4)",
                      }}
                    >
                      {index + 1}
                    </div>
                    <input
                      id={`setup-avatar-${index}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onAvatarFile(index, e)}
                    />
                    <div className="relative flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => document.getElementById(`setup-avatar-${index}`)?.click()}
                        className="w-10 h-10 rounded-full overflow-hidden border flex items-center justify-center transition-all duration-200 hover:scale-105"
                        style={{
                          borderColor: "rgba(255,255,255,0.12)",
                          background: row.avatarUrl ? "transparent" : "rgba(255,255,255,0.05)",
                        }}
                        title="Add profile photo"
                      >
                        {row.avatarUrl ? (
                          <img src={row.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImagePlus className="w-4 h-4" style={{ color: "rgba(239,239,239,0.35)" }} />
                        )}
                      </button>
                      {row.avatarUrl ? (
                        <button
                          type="button"
                          onClick={() => setPlayerAvatar(index, undefined)}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: "#DC2626", color: "#fff" }}
                          title="Remove photo"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      ) : null}
                    </div>
                    <Input
                      value={row.name}
                      onChange={(e) => updatePlayerName(index, e.target.value)}
                      placeholder={`Player ${index + 1}`}
                      className="flex-1 h-10 text-sm min-w-0"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#EFEFEF",
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (index === rows.length - 1) addPlayer();
                        }
                      }}
                    />
                    <button
                      onClick={() => removePlayer(index)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 flex-shrink-0"
                      style={{
                        background: "rgba(220,38,38,0.08)",
                        color: rows.length <= 4 ? "rgba(220,38,38,0.3)" : "rgba(220,38,38,0.7)",
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Add player button */}
            <button
              onClick={addPlayer}
              className="w-full h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 hover:scale-[1.02] mb-6"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px dashed rgba(255,255,255,0.15)",
                color: "rgba(239,239,239,0.5)",
              }}
            >
              <Plus className="w-4 h-4" />
              Add Player
            </button>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-sm mb-4 text-center"
                  style={{ color: "#DC2626" }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              className="w-full h-12 text-base font-semibold tracking-wide rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
              style={{
                background: "linear-gradient(135deg, #DC2626, #991B1B)",
                color: "#EFEFEF",
                border: "none",
                boxShadow: "0 4px 20px rgba(220,38,38,0.3)",
              }}
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Generate Tournament
            </Button>

            <div
              className="mt-6 pt-6 border-t space-y-3"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <input
                ref={restoreInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={onRestoreFile}
              />
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(239,239,239,0.4)" }}>
                Shared tournament
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(239,239,239,0.45)" }}>
                Host can use <strong style={{ color: "rgba(239,239,239,0.65)" }}>Roster → Download backup</strong> and
                send you the JSON. Open it here to copy the full tournament — teams, profile photos, every match and
                score — onto this laptop or phone browser.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 rounded-xl gap-2"
                style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(239,239,239,0.8)" }}
                onClick={() => restoreInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                Restore tournament from JSON…
              </Button>
              {restoreNotice ? (
                <p className="text-xs text-center" style={{ color: restoreNotice.tone === "ok" ? "#4ade80" : "#DC2626" }}>
                  {restoreNotice.text}
                </p>
              ) : null}
            </div>

            {/* Info footer */}
            <p className="text-center text-xs mt-4" style={{ color: "rgba(239,239,239,0.3)" }}>
              Round-robin league · Top 4 advance · IPL-style knockout
            </p>
            <button
              type="button"
              onClick={() => window.open(`${window.location.origin}/display`, "_blank", "noopener,noreferrer")}
              className="w-full mt-2 py-2 text-xs rounded-lg transition-all duration-200 hover:scale-[1.01]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(239,239,239,0.45)",
              }}
            >
              Open display board (external monitor)
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
