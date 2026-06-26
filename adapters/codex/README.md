# Codex CLI adapter

Config: `~/.codex/hooks.json` and `~/.codex/config.toml` (`codex_hooks = true`)

## Limitations (v0.1)

- `PreToolUse` / `PostToolUse` mainly fire for **Bash** today
- Red light for file edits is best-effort via Bash heuristics
- Hooks are experimental on Windows

| Event | Light |
|-------|-------|
| `UserPromptSubmit` | yellow |
| `PreToolUse` (Bash) | red |
| `PostToolUse` | yellow |
| `Stop` | green |

Docs: https://developers.openai.com/codex/hooks
