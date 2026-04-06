import { cn } from "@/lib/utils";

type Tone = "luxLight" | "luxDark" | "cardWhite" | "cardBlack";

const toneShell: Record<
  Tone,
  { background: string; borderColor: string; color: string; boxShadow: string }
> = {
  luxLight: {
    background: "radial-gradient(circle at 35% 35%, #F5F5F5, #B8B8B8)",
    borderColor: "rgba(255,255,255,0.35)",
    color: "#111",
    boxShadow: "0 0 60px rgba(220,38,38,0.15)",
  },
  luxDark: {
    background: "radial-gradient(circle at 35% 35%, #2A2A2A, #0a0a0a)",
    borderColor: "rgba(220,38,38,0.35)",
    color: "#EFEFEF",
    boxShadow: "0 0 50px rgba(0,0,0,0.6)",
  },
  cardWhite: {
    background: "radial-gradient(circle at 35% 35%, #F5F5F5, #D0D0D0)",
    borderColor: "rgba(255,255,255,0.4)",
    color: "#111",
    boxShadow: "0 4px 15px rgba(255,255,255,0.15)",
  },
  cardBlack: {
    background: "radial-gradient(circle at 35% 35%, #2A2A2A, #111)",
    borderColor: "rgba(255,255,255,0.1)",
    color: "#EFEFEF",
    boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
  },
};

/** Rounded avatar: optional photo, else first initial (display / control cards). */
export function PlayerFaceCircle({
  name,
  avatarUrl,
  className,
  tone,
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  tone: Tone;
}) {
  const shell = toneShell[tone];
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (avatarUrl) {
    return (
      <div
        className={cn(
          "rounded-full overflow-hidden border-2 flex-shrink-0 flex items-center justify-center bg-black/40",
          className
        )}
        style={{ borderColor: shell.borderColor, boxShadow: shell.boxShadow }}
      >
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full border-2 flex items-center justify-center font-black flex-shrink-0",
        className
      )}
      style={{
        background: shell.background,
        borderColor: shell.borderColor,
        color: shell.color,
        boxShadow: shell.boxShadow,
      }}
    >
      {initial}
    </div>
  );
}
