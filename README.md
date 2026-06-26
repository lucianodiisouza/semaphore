# Semaphore

Floating traffic light for AI coding agents. Shows when your agent is idle, thinking, or writing files, without switching windows or reading the terminal.

| Light | Meaning |
|-------|---------|
| **Green** | Ready for a new task (idle) |
| **Yellow** | Thinking / running tools |
| **Red** | Writing or editing files |

Semaphore is a small always-on-top widget in the system tray. AI tools send activity updates through **hooks**, and Semaphore updates the light.

---

## Table of contents

- [Download](#download)
- [Quick start](#quick-start)
- [Using the app](#using-the-app)
- [Supported tools](#supported-tools-v01)
- [semctl CLI](#semctl-cli)
- [Configuration](#configuration)
- [How it works](#how-it-works)
- [Architecture](#architecture)
- [Development](#development)
- [Themes & i18n](#themes--i18n)
- [Sounds](#sounds)
- [Stealth mode](#stealth-mode)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Download

Pre-built binaries for macOS (Apple Silicon & Intel), Linux, and Windows:

**[Download latest release](https://github.com/lucianodiisouza/semaphore/releases/latest)**

Each release includes:

| Asset | Description |
|-------|-------------|
| **Semaphore app** | `.dmg` (macOS), `.msi` (Windows), `.deb` or `.AppImage` (Linux) |
| **semctl** | CLI bundled inside the app; copied to `~/.semaphore/bin/` on first run |

You don't need a terminal for normal use after install.

---

## Quick start

1. **Download** a release for your OS (or [build from source](#development))
2. **Launch Semaphore** — it stays in the system tray and shows the floating widget
3. **Complete onboarding** (first launch) or open **Settings** and connect your AI tools
4. **Use your tools normally** — hooks update the light automatically

To connect tools from the terminal instead:

```bash
semctl install --all
semctl doctor
```

---

## Using the app

### Move the widget

**Click and drag the traffic light body** (the dark housing with the three lights). Do not drag the empty space around it — grab the semáforo itself.

On hover, a tooltip shows *"Click and drag here to move"* (or the Portuguese equivalent).

### Settings

Open settings in either way:

- **Hover** the widget and click the **⚙** button (top-right corner)
- **Right-click** the tray icon → **Settings**

Settings opens in its own window with:

| Section | Options |
|---------|---------|
| **Appearance** | Theme, widget size (small / medium / large), horizontal layout |
| **Language** | English, Portuguese (Brazil) |
| **Behavior** | Stealth mode, always on top, idle timeout, launch at login |
| **Tools** | Detect installed AI tools, connect / disconnect hooks |
| **Sounds** | Per-stage audio alerts (presets or custom files) |
| **About** | Version, restart onboarding |

### Tray menu

Right-click the Semaphore icon in the system tray:

| Menu item | Action |
|-----------|--------|
| **Show Semaphore** | Show the floating widget |
| **Hide Window** | Hide the floating widget |
| **Settings** | Open the settings window |
| **Toggle Stealth** | Hide the widget from screen capture |
| **Always on Top** | Keep the widget above other windows (not in macOS fullscreen) |
| **Horizontal** | Rotate the traffic light to a horizontal layout |
| **Test Lights** | Play a short melody and cycle green, yellow, and red |
| **Play Genius** | Memory game — repeat the light sequence by clicking the lights |
| **Quit** | Exit Semaphore |

Left-click the tray icon to show/focus the widget.

### Onboarding

On first launch, a welcome window walks you through connecting tools and positioning the widget. You can replay it anytime from **Settings → About → Restart onboarding**.

### Launch with tools

When **Launch with tools** is enabled in Settings, Semaphore adds a session-start hook to every connected tool so the app opens automatically when you start a new AI session. This is optional and off by default.

---

## Supported tools (v0.1)

| Tool | Status | Config path | Install |
|------|--------|-------------|---------|
| **Cursor** | Supported | `~/.cursor/hooks.json` | Settings → Connect, or `semctl install cursor` |
| **Claude Code** | Supported | `~/.claude/settings.json` | Settings → Connect, or `semctl install claude-code` |
| **Codex CLI** | Supported (Bash hooks; file edit limited) | `~/.codex/hooks.json` + `~/.codex/config.toml` | Settings → Connect, or `semctl install codex` |
| **Gemini CLI** | Supported | `~/.gemini/settings.json` | Settings → Connect, or `semctl install gemini-cli` |
| **Copilot CLI** | Best-effort (varies by version) | `~/.copilot/hooks.json` | Settings → Connect, or `semctl install copilot-cli` |

```bash
# Install hooks for all supported tools
semctl install --all

# Remove Semaphore entries from tool configs
semctl uninstall --all

# Check installation health
semctl doctor
```

### Per-tool hook mapping

See [adapters/README.md](adapters/README.md) and the per-tool docs:

- [Cursor](adapters/cursor/README.md)
- [Claude Code](adapters/claude-code/README.md)
- [Codex CLI](adapters/codex/README.md) — `PreToolUse` / `PostToolUse` mainly fire for **Bash** today; red light for file edits is best-effort
- [Gemini CLI](adapters/gemini-cli/README.md)
- [Copilot CLI](adapters/copilot-cli/README.md) — hook surface varies by Copilot CLI version

The installer merges hook entries into your existing config using a `_semaphore` marker. It never overwrites unrelated hooks.

---

## semctl CLI

`semctl` is the command-line interface for hooks, installation, and manual control. After install it lives at `~/.semaphore/bin/semctl` (or `semctl.exe` on Windows).

### Set light state

```bash
semctl green                          # idle
semctl yellow                         # thinking
semctl red                            # writing
semctl set yellow --session my-id --source script --reason "custom"
```

### Query state

```bash
semctl status                         # prints: green | yellow | red
```

### Install / uninstall hooks

```bash
semctl install cursor
semctl install --all
semctl uninstall claude-code
semctl uninstall --all
```

### Diagnostics & launch

```bash
semctl doctor                         # config dir, socket, binaries, per-tool hooks
semctl launch                         # start Semaphore if not running
```

### Environment variables

| Variable | Purpose |
|----------|---------|
| `SEMAPHORE_SOCKET` | Override IPC socket / named pipe path |
| `SEMAPHORE_BIN` | Override path to `semctl` (used by `sem-hook`) |
| `SEMAPHORE_SEMCTL` | Source binary for `deploy_semctl` |

### sem-hook

`~/.semaphore/bin/sem-hook` is a thin wrapper invoked by AI tool hooks. It parses optional JSON from stdin (for `session_id`, `conversation_id`, or `sessionId`), then calls `semctl set`. Hooks always exit `0` so they never block the agent.

---

## Configuration

Config is stored at `~/.semaphore/config.json` and created with defaults on first run.

```json
{
  "idle_timeout_secs": 300,
  "stealth": false,
  "always_on_top": true,
  "theme": "classic",
  "locale": "en",
  "stealth_acknowledged": false,
  "onboarding_completed": false,
  "autostart": false,
  "launch_with_tools": false,
  "window": {
    "x": 20,
    "y": 20,
    "size": "medium",
    "horizontal": false
  },
  "sounds": {
    "enabled": false,
    "green": { "preset": "soft-chime", "custom_path": null },
    "yellow": { "preset": "double-ping", "custom_path": null },
    "red": { "preset": "alert", "custom_path": null }
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `idle_timeout_secs` | `300` | Stale sessions are pruned after this many seconds with no updates |
| `stealth` | `false` | Hide widget from screen capture |
| `always_on_top` | `true` | Keep widget above other windows |
| `theme` | `"classic"` | `classic`, `minimal`, or `neon` |
| `locale` | `"en"` or auto-detected `pt-BR` | UI language |
| `window.size` | `"medium"` | `small`, `medium`, or `large` |
| `window.horizontal` | `false` | Horizontal traffic light layout |
| `sounds.enabled` | `false` | Play audio on state transitions |
| `autostart` | `false` | Launch Semaphore at login |
| `launch_with_tools` | `false` | Auto-launch Semaphore when a connected tool starts a session |

Custom sounds are copied to `~/.semaphore/sounds/` (max 512 KB; mp3, wav, ogg, m4a, aac, webm).

---

## How it works

```
AI tool lifecycle events
        │
        ▼
  Tool hooks.json / settings.json
        │
        ▼
  sem-hook (parses stdin, resolves session)
        │
        ▼
  semctl set <state> --session <id>
        │
        ▼
  IPC (Unix socket / Windows named pipe)
        │
        ▼
  Semaphore app (state machine → UI)
```

1. **Hooks fire** when an AI tool starts thinking, uses a tool, edits a file, or finishes a turn.
2. **`sem-hook`** translates the event into a light color and forwards it to `semctl`.
3. **`semctl`** sends a JSON line over IPC to the running Semaphore app.
4. **State machine** tracks one entry per session ID and picks the highest-priority color: **red > yellow > green**.
5. **UI** receives a `state-changed` event and updates the widget (and optional sound).

Stale sessions are pruned every 30 seconds based on `idle_timeout_secs`. Setting a session to **green** removes it from the active set.

---

## Architecture

### Crates

| Crate / package | Role |
|-----------------|------|
| **sem-core** | State machine, session aggregation, IPC server/client, config |
| **semctl** | CLI — `set`, `status`, `install`, `uninstall`, `doctor`, `launch` |
| **semaphore** (Tauri) | Floating widget, tray, settings & onboarding windows |
| **Frontend** (`src/`) | TypeScript + Vite — widget rendering, themes, i18n, sounds |

### IPC protocol

Newline-delimited JSON over:

- **Unix/macOS/Linux:** `$XDG_RUNTIME_DIR/semaphore.sock`, or `/tmp/semaphore-<uid>.sock`
- **Windows:** `\\.\pipe\semaphore`

**Set state:**

```json
{"cmd":"set","state":"yellow","session":"abc123","source":"cursor","reason":"thinking"}
```

**Query state:**

```json
{"cmd":"status"}
```

**Response:**

```json
{"state":"yellow"}
```

### Project layout

```
traffic-lights/
├── adapters/           # Per-tool hook templates & docs
├── crates/
│   ├── sem-core/       # Shared library (state, IPC, config)
│   └── semctl/         # CLI & installer
├── locales/            # en.json, pt-BR.json
├── src/                # Frontend (widget, settings, themes)
├── src-tauri/          # Tauri app shell
└── scripts/            # Build helpers (stage semctl)
```

---

## Development

### Requirements

- **Rust** (stable)
- **Node.js** 20+
- **npm**

**Linux** also needs WebKit/GTK dev packages:

```bash
sudo apt-get install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

### Run locally

```bash
npm install
npm run tauri dev
```

This starts the Vite dev server, builds `semctl`, and launches the Tauri app with hot reload.

### Build

```bash
# Desktop app (release bundle)
npm run tauri build

# CLI only
cargo build -p semctl --release
```

### Test

```bash
cargo test                    # Rust unit tests (sem-core, semctl)
npm test                      # Frontend tests (Vitest)
```

### Release

Tag a version to trigger the GitHub Actions release workflow:

```bash
git tag v0.2.0
git push origin v0.2.0
```

Builds run for macOS (arm64 + x64), Linux (x64), and Windows (x64). Artifacts are published to [GitHub Releases](https://github.com/lucianodiisouza/semaphore/releases).

---

## Themes & i18n

### Themes

Built-in themes live in `src/themes/`:

| ID | Style |
|----|-------|
| `classic` | Dark housing, vivid lens colors with glow |
| `minimal` | Flat, subdued palette |
| `neon` | High-contrast neon accents |

Each theme is a JSON file with housing, lens, and glow colors. Select in Settings or set `"theme"` in config.

### Languages

- **English** (`en`) — default
- **Portuguese (Brazil)** (`pt-BR`) — auto-detected from `LC_ALL` / `LANG`

To add a language, see [locales/CONTRIBUTING-i18n.md](locales/CONTRIBUTING-i18n.md).

---

## Sounds

Optional audio plays when the light changes state. Configure in **Settings → Sounds**.

| Stage | Default preset |
|-------|----------------|
| Green | `soft-chime` |
| Yellow | `double-ping` |
| Red | `alert` |

Presets are synthesized in-browser. You can also import a custom file per stage (≤ 512 KB). Built-in presets: `soft-chime`, `double-ping`, `alert`, `chime`, `ping`, `beep`.

---

## Stealth mode

Stealth mode hides the widget from many screen-capture and screen-sharing tools by marking the window content-protected.

| Platform | Behavior |
|----------|----------|
| **Windows** | Works well with most capture tools |
| **macOS 15+** | May still appear in some apps (OS limitation) |
| **Linux** | Depends on compositor |

Enable in **Settings** or the tray menu (**Toggle Stealth**). A one-time acknowledgment is stored in config.

---

## Troubleshooting

### Light stays green while the agent is working

1. Confirm Semaphore is running (tray icon visible).
2. Run `semctl doctor` — check that hooks show `[ok]` for your tool.
3. Reconnect the tool: **Settings → Tools → Connect**, or `semctl install <tool>`.
4. Restart the AI tool so it reloads hook config.
5. For **Codex CLI**, ensure `codex_hooks = true` in `~/.codex/config.toml` (the installer sets this).

### `semctl doctor` shows socket as "waiting"

The IPC server starts with the Semaphore app. Launch Semaphore first, then run hooks or `semctl set`.

### Hooks installed but tool not detected

`semctl doctor` checks for the `_semaphore` marker in config files. If you edited hooks manually, ensure Semaphore entries were not removed.

### Light stuck on yellow/red

Sessions expire after `idle_timeout_secs` (default 5 minutes). Lower the timeout in Settings, or send `semctl green` manually.

### Custom socket path

```bash
export SEMAPHORE_SOCKET=/path/to/my.sock
```

Set the same variable for both the Semaphore app and `semctl`.

---

## Contributing

### Add a new AI tool adapter

1. Add `adapters/<tool>/README.md` with hook event → light mapping
2. Add install/uninstall logic in `crates/semctl/src/install.rs`
3. Register the tool in `ALL_TOOLS`, `run_install`, `doctor`, and `detect.rs`
4. Open a pull request

### Translations

See [locales/CONTRIBUTING-i18n.md](locales/CONTRIBUTING-i18n.md).

### CI

Every push to `main` and every pull request runs `cargo test`, `cargo build -p semctl`, `npm test`, and `npm run build` on Ubuntu, macOS, and Windows.

---

## License

MIT — see [LICENSE](LICENSE).
