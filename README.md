# Carrom Tournament

A browser-based tournament app for **round-robin league** play, **tiebreakers**, and an **IPL-style knockout** bracket (Qualifier 1, Eliminator, Qualifier 2, Final). Run the control UI on a laptop or phone and put **`/display`** on a second screen for the audience.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Setup** — Register players, optional profile photos (compressed for `localStorage`), generate the league fixture list.
- **League** — Record results, standings, match list, advance when ready.
- **Tiebreaker** — Mini round-robin when needed for top-four spots.
- **Knockout** — Parallel Q1 + Eliminator, then Q2 and Final; champion screen.
- **Display board** (`/display`) — Large matchup hero, micro-bracket, on-deck footer, league ticker (hidden during knockout), head-to-head hints from round-robin.
- **Roster** (`/players`) — After the tournament starts: edit names and photos only (same player IDs; no add/remove).
- **Backup & restore** — Download JSON of the full tournament (players, photos, all results). Optional **password-protected** exports (PBKDF2 + AES-GCM in the browser). Restore from the home screen or roster page.
- **Persistence** — State is saved in **`localStorage`** and synced across tabs on the same origin via the `storage` event.

> **Privacy:** There is no server database. Each browser keeps its own copy unless you share a backup file. Encrypted backups reduce risk if the JSON is sent over chat or email.

## Tech stack

- **React 19**, **TypeScript**, **Vite**
- **Tailwind CSS** + **shadcn-style** UI components
- **Framer Motion**, **wouter** (routing)
- **pnpm** (package manager; includes a small **wouter** patch)

## Requirements

- **Node.js** 20+ recommended  
- **pnpm** (the repo pins `packageManager` in `package.json`; `corepack enable` is enough on many setups)

## Quick start

```bash
git clone https://github.com/kumarAdhikari/carrom-tournament.git
cd carrom-tournament
pnpm install
pnpm dev
```

Open the URL Vite prints (with `--host`, often `http://localhost:5173`).

| Path        | Purpose |
|------------|---------|
| `/`        | Main app: setup → league → tiebreaker → knockout (by stage) |
| `/display` | Read-only / broadcast view (same `localStorage` as the control tab) |
| `/players` | Roster edits, backup download, restore (also available when no tournament yet for restore-only) |

## Scripts

| Command        | Description |
|----------------|-------------|
| `pnpm dev`     | Start Vite dev server with `--host` |
| `pnpm build`   | Production client build + bundle server entry |
| `pnpm start`   | Run production server (`node dist/index.js`) |
| `pnpm preview` | Preview production client build |
| `pnpm check`   | Typecheck (`tsc --noEmit`) |
| `pnpm format`  | Prettier write |

## Backup file format

- **Plain:** `{ "version": 1, "state": { ... } }` — same schema as internal storage; includes embedded photo data URLs where used.
- **Encrypted:** JSON envelope with `format: "carrom-backup-encrypted-v1"`, KDF parameters, salt, IV, and ciphertext. The decrypted payload is the same plain document.

Restore prompts for a password when the file is encrypted. Plain files from older exports still work.

## Project layout (high level)

```
client/src/
  pages/           # Setup, League, Tiebreaker, Knockout, Display, PlayerEdit
  contexts/        # Tournament state + localStorage hydration
  lib/             # Tournament rules, backup crypto, image compression
server/            # Optional production static/server bundle
```

Core tournament logic lives in **`client/src/lib/tournament.ts`**.

## Contributing

Issues and PRs are welcome. Please run **`pnpm check`** before submitting.

## License

MIT — see [`package.json`](./package.json) `license` field.
