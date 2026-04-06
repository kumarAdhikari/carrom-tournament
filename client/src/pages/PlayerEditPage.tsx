// =============================================================================
// Roster edit — names & photos only (no add/remove players). Auto-persists via context.
// =============================================================================

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Download, ImagePlus, Upload, UserPen, X } from "lucide-react";
import { PlayerFaceCircle } from "@/components/PlayerFaceCircle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TOURNAMENT_BACKUP_FILE_VERSION, useTournament } from "@/contexts/TournamentContext";
import { encryptBackupPlaintext } from "@/lib/backupCrypto";
import { imageFileToStoredAvatarUrl } from "@/lib/imageCompress";
import { parseBackupWithPasswordPrompt } from "@/lib/restoreBackupPrompt";
import type { Player } from "@/lib/tournament";

function PlayerEditRow({
  player,
  updatePlayerProfile,
  error,
  onClearError,
}: {
  player: Player;
  updatePlayerProfile: ReturnType<typeof useTournament>["updatePlayerProfile"];
  error?: string;
  onClearError: () => void;
}) {
  const [nameDraft, setNameDraft] = useState(player.name);

  useEffect(() => {
    setNameDraft(player.name);
  }, [player.name]);

  const commitName = () => {
    if (nameDraft.trim() === player.name) return;
    const r = updatePlayerProfile(player.id, { name: nameDraft });
    if (!r.ok) {
      setNameDraft(player.name);
    }
  };

  const onAvatarFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const url = await imageFileToStoredAvatarUrl(file);
      updatePlayerProfile(player.id, { avatarUrl: url });
    } catch {
      /* ignored — compression failed */
    }
  };

  const clearAvatar = () => {
    updatePlayerProfile(player.id, { avatarUrl: null });
  };

  return (
    <motion.div
      layout
      className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{ background: "rgba(28,28,28,0.75)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <input id={`avatar-${player.id}`} type="file" accept="image/*" className="hidden" onChange={onAvatarFile} />
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => (
              document.getElementById(`avatar-${player.id}`) as HTMLInputElement | null
            )?.click()}
            className="block"
            title="Change photo"
          >
            <PlayerFaceCircle
              name={nameDraft || player.name}
              avatarUrl={player.avatarUrl}
              tone="luxDark"
              className="h-14 w-14 text-lg"
            />
          </button>
          <button
            type="button"
            onClick={() => (
              document.getElementById(`avatar-${player.id}`) as HTMLInputElement | null
            )?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border"
            style={{
              background: "rgba(13,13,13,0.95)",
              borderColor: "rgba(255,255,255,0.12)",
              color: "rgba(239,239,239,0.7)",
            }}
            title="Upload photo"
          >
            <ImagePlus className="w-3.5 h-3.5" />
          </button>
          {player.avatarUrl ? (
            <button
              type="button"
              onClick={clearAvatar}
              className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "#DC2626", color: "#fff" }}
              title="Remove photo"
            >
              <X className="w-3 h-3" />
            </button>
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "rgba(239,239,239,0.4)" }}>
            Name
          </label>
          <Input
            value={nameDraft}
            onChange={(e) => {
              setNameDraft(e.target.value);
              onClearError();
            }}
            onBlur={commitName}
            className="h-10 text-sm"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#EFEFEF",
            }}
          />
          {error ? (
            <p className="text-xs mt-1" style={{ color: "#DC2626" }}>
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export default function PlayerEditPage() {
  const { state, updatePlayerProfile, restoreTournamentFromBackup } = useTournament();
  const { players, stage } = state;
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [backupNotice, setBackupNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [backupProtectWithPassword, setBackupProtectWithPassword] = useState(true);
  const [backupPass, setBackupPass] = useState("");
  const [backupPassConfirm, setBackupPassConfirm] = useState("");
  const [backupDlError, setBackupDlError] = useState<string | null>(null);

  const downloadBackup = async () => {
    setBackupDlError(null);
    const plain = JSON.stringify({ version: TOURNAMENT_BACKUP_FILE_VERSION, state }, null, 2);
    let out: string;
    if (backupProtectWithPassword) {
      if (!backupPass) {
        setBackupDlError("Choose a password for this file.");
        return;
      }
      if (backupPass !== backupPassConfirm) {
        setBackupDlError("Password and confirmation must match.");
        return;
      }
      try {
        out = await encryptBackupPlaintext(plain, backupPass);
      } catch {
        setBackupDlError("Could not encrypt this backup.");
        return;
      }
    } else {
      out = plain;
    }
    const blob = new Blob([out], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "carrom-tournament-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onRestoreFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBackupNotice(null);
    try {
      const text = await file.text();
      const parsed = await parseBackupWithPasswordPrompt(text);
      if (!parsed.ok) {
        if (parsed.reason === "cancelled") {
          setBackupNotice({ tone: "err", text: "Restore cancelled." });
          return;
        }
        setBackupNotice({
          tone: "err",
          text: "Could not load backup (wrong version, corrupted file, or not a Carrom tournament file).",
        });
        return;
      }
      if (
        !window.confirm(
          "Replace the current tournament with this backup? Everything in progress now will be overwritten."
        )
      ) {
        return;
      }
      restoreTournamentFromBackup(parsed.state);
      setBackupNotice({
        tone: "ok",
        text: "Restored. This tab and the display board update automatically; other control tabs sync via storage.",
      });
      window.setTimeout(() => setBackupNotice((n) => (n?.tone === "ok" ? null : n)), 6000);
    } catch {
      setBackupNotice({ tone: "err", text: "Could not read that file." });
    }
  };

  const backupCard = (
    <div
      className="rounded-xl p-4 space-y-3 w-full max-w-md"
      style={{ background: "rgba(28,28,28,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(239,239,239,0.45)" }}>
        Backup & restore
      </p>
      <p className="text-xs leading-relaxed" style={{ color: "rgba(239,239,239,0.55)" }}>
        Full tournament snapshot (players, photos, every result). You can encrypt the file with a password so only
        someone with the password can restore it (AES-GCM + PBKDF2 in the browser).
      </p>
      <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
        <input
          type="checkbox"
          className="mt-0.5 rounded border"
          checked={backupProtectWithPassword}
          onChange={(e) => {
            setBackupProtectWithPassword(e.target.checked);
            setBackupDlError(null);
          }}
          style={{ borderColor: "rgba(255,255,255,0.2)" }}
        />
        <span style={{ color: "rgba(239,239,239,0.65)" }}>
          Password-protect download (recommended when sharing). Uncheck for a plain JSON file (older behavior).
        </span>
      </label>
      {backupProtectWithPassword ? (
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Password"
            value={backupPass}
            onChange={(e) => {
              setBackupPass(e.target.value);
              setBackupDlError(null);
            }}
            className="h-10 text-sm"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#EFEFEF",
            }}
            autoComplete="new-password"
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={backupPassConfirm}
            onChange={(e) => {
              setBackupPassConfirm(e.target.value);
              setBackupDlError(null);
            }}
            className="h-10 text-sm"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#EFEFEF",
            }}
            autoComplete="new-password"
          />
        </div>
      ) : null}
      {backupDlError ? (
        <p className="text-xs" style={{ color: "#DC2626" }}>
          {backupDlError}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={() => void downloadBackup()}
          variant="outline"
          className="w-full h-11 rounded-xl gap-2"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(239,239,239,0.75)" }}
        >
          <Download className="w-4 h-4" />
          Download backup (JSON)
        </Button>
        <Button
          type="button"
          onClick={() => restoreInputRef.current?.click()}
          variant="outline"
          className="w-full h-11 rounded-xl gap-2"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(239,239,239,0.75)" }}
        >
          <Upload className="w-4 h-4" />
          Restore from backup…
        </Button>
      </div>
      {backupNotice ? (
        <p className="text-xs" style={{ color: backupNotice.tone === "ok" ? "#4ade80" : "#DC2626" }}>
          {backupNotice.text}
        </p>
      ) : null}
    </div>
  );

  if (stage === "setup") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-6 py-12" style={{ background: "#0D0D0D" }}>
        <input
          ref={restoreInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onRestoreFile}
        />
        <UserPen className="w-12 h-12" style={{ color: "rgba(239,239,239,0.25)" }} />
        <p className="text-center max-w-sm" style={{ color: "rgba(239,239,239,0.55)" }}>
          Generate a tournament to edit the roster here — or restore a previous tournament from a JSON backup (includes
          photos and all results).
        </p>
        {backupCard}
        <Link href="/">
          <Button
            variant="outline"
            className="rounded-xl"
            style={{ borderColor: "rgba(255,255,255,0.15)", color: "#EFEFEF" }}
          >
            Back to setup
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "#0D0D0D" }}>
      <input
        ref={restoreInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onRestoreFile}
      />
      <div
        className="sticky top-0 z-20 px-4 py-4 border-b"
        style={{ background: "rgba(13,13,13,0.95)", backdropFilter: "blur(12px)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/">
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 hover:scale-105"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(239,239,239,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <ChevronLeft className="w-5 h-5" />
            </span>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate" style={{ fontFamily: "'Playfair Display', serif", color: "#EFEFEF" }}>
              Roster & save
            </h1>
            <p className="text-xs truncate" style={{ color: "rgba(239,239,239,0.4)" }}>
              Edit names and photos · same players · auto-saved in this browser
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", color: "rgba(239,239,239,0.65)" }}
        >
          You cannot add or remove players. Renaming updates the bracket, league, and display everywhere — IDs stay fixed.
        </div>

        <div className="space-y-3">
          {players.map((p) => (
            <PlayerEditRow
              key={p.id}
              player={p}
              updatePlayerProfile={(id, patch) => {
                const r = updatePlayerProfile(id, patch);
                if (!r.ok) {
                  setRowErrors((prev) => ({ ...prev, [id]: r.error }));
                  return r;
                }
                setRowErrors((prev) => {
                  const next = { ...prev };
                  delete next[id];
                  return next;
                });
                return r;
              }}
              error={rowErrors[p.id]}
              onClearError={() =>
                setRowErrors((prev) => {
                  const next = { ...prev };
                  delete next[p.id];
                  return next;
                })
              }
            />
          ))}
        </div>

        {backupCard}
      </div>
    </div>
  );
}
