# Semaphore adapters

Each subdirectory documents hook templates for one AI tool. The installer (`semctl install <tool>`) merges these into your local config without overwriting existing hooks.

| Tool | Config path | `semctl install` |
|------|-------------|------------------|
| Cursor | `~/.cursor/hooks.json` | `cursor` |
| Claude Code | `~/.claude/settings.json` | `claude-code` |
| Codex CLI | `~/.codex/hooks.json` + `~/.codex/config.toml` | `codex` |
| Gemini CLI | `~/.gemini/settings.json` | `gemini-cli` |
| Copilot CLI | `~/.copilot/hooks.json` | `copilot-cli` |

Install all supported tools:

```bash
semctl install --all
```

## Adding a new tool

1. Add `adapters/<tool>/README.md` with hook event mapping
2. Add install/uninstall logic in `crates/semctl/src/install.rs`
3. Register the tool name in `run_install` / `doctor`
4. Open a PR

See [locales/CONTRIBUTING-i18n.md](../locales/CONTRIBUTING-i18n.md) for translations.
