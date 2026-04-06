import { parseTournamentBackup } from "@/contexts/TournamentContext";
import type { TournamentState } from "@/lib/tournament";

/** Plain or unknown-encryption: parse immediately. Encrypted: loop `window.prompt` until success, cancel, or non-password error. */
export async function parseBackupWithPasswordPrompt(
  raw: string
): Promise<{ ok: true; state: TournamentState } | { ok: false; reason: "invalid" | "cancelled" }> {
  let password: string | undefined = undefined;
  for (;;) {
    const r = await parseTournamentBackup(raw, password);
    if (r.ok) return r;
    if (r.reason === "needs_password" || r.reason === "wrong_password") {
      const msg =
        r.reason === "wrong_password"
          ? "Wrong password. Try again (or Cancel to stop):"
          : "This backup is password-protected. Enter password:";
      const p = window.prompt(msg);
      if (p === null) return { ok: false, reason: "cancelled" };
      password = p;
      continue;
    }
    return { ok: false, reason: "invalid" };
  }
}
