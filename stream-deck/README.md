# Semaphore for Stream Deck

Show your AI coding agent’s status on Elgato Stream Deck keys — green (idle), yellow (thinking), or red (writing files).

> **This plugin does not work on its own.** You must install and run the free [Semaphore](https://github.com/lucianodiisouza/semaphore) desktop app. The plugin reads the agent state from Semaphore; it does not connect to Cursor or other AI tools directly.

---

## Requirements

| Requirement | Details |
|-------------|---------|
| **Semaphore app** | [Download latest release](https://github.com/lucianodiisouza/semaphore/releases/latest) — must be running in the background |
| **Stream Deck software** | v6.9 or later (Windows or macOS) |
| **AI tool hooks** | Your coding agent (e.g. Cursor) must be connected to Semaphore |

Linux is not supported by Elgato Stream Deck.

---

## Quick setup

### 1. Install Semaphore

1. Download Semaphore for your OS from [GitHub Releases](https://github.com/lucianodiisouza/semaphore/releases/latest).
2. Install and launch the app. It stays in the system tray.

### 2. Connect your AI tools

On first launch, complete the onboarding wizard, **or** open **Settings → Tools** and connect your tools (e.g. Cursor).

From the terminal (optional):

```bash
semctl install --all
semctl doctor
```

### 3. Install this plugin

If you installed from the **Elgato Marketplace**, the plugin is already in Stream Deck — skip to step 4.

Otherwise, install via Semaphore onboarding:

1. Open **Settings → About → Restart onboarding**
2. Go to the **Stream Deck** step
3. Check **Install Stream Deck plugin** and click **Next**

> The checkbox is only enabled when Stream Deck is installed. If it is greyed out, install Stream Deck first, then redo onboarding.

### 4. Add actions to your Stream Deck

1. Open the Stream Deck app.
2. Find the **Semaphore** category in the action list.
3. Drag an action onto a key:

| Action | Use case |
|--------|----------|
| **Semaphore Light** | One key that changes color automatically |
| **Green Light** | Lights up when the agent is idle |
| **Yellow Light** | Lights up when the agent is thinking |
| **Red Light** | Lights up when the agent is writing files |

**Tip:** Place **Green**, **Yellow**, and **Red Light** on three adjacent keys to build a full traffic light.

Keys update every **500 ms** — no button presses needed.

---

## What the colors mean

| Key color | Meaning |
|-----------|---------|
| **Green** | Agent is idle and ready for a new task |
| **Yellow** | Agent is thinking or running tools |
| **Red** | Agent is writing or editing files |
| **Grey** | Semaphore is not running (or not connected) |

---

## Troubleshooting

### Keys stay grey

- **Semaphore is not running** — launch the app from the system tray or Start menu.
- **AI tools not connected** — open Semaphore **Settings → Tools** and connect your agent.
- **Stream Deck needs a restart** — quit and reopen the Stream Deck app after installing the plugin.

### Keys never change from green

- Make sure hooks are installed for your AI tool (`semctl doctor` in a terminal).
- Use your agent normally — the light updates when Semaphore receives activity events.

### Plugin not listed in Stream Deck

- Confirm Stream Deck is **v6.9+**.
- Reinstall via Semaphore onboarding (see step 3 above), or restart Stream Deck.

---

## How it works

```
AI agent (Cursor, etc.)
        ↓ hooks
   Semaphore desktop app
        ↓ IPC (local pipe / socket)
   Stream Deck plugin  →  key images update
```

The plugin polls Semaphore every 500 ms. When Semaphore is closed, keys show grey.

---

## Links

- **Semaphore app & docs:** [github.com/lucianodiisouza/semaphore](https://github.com/lucianodiisouza/semaphore)
- **Report issues:** [GitHub Issues](https://github.com/lucianodiisouza/semaphore/issues)

---

## License

MIT — see [LICENSE](../LICENSE) in the main repository.
