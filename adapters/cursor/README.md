# Cursor adapter

Config: `~/.cursor/hooks.json` (or project `.cursor/hooks.json`)

| Event | Light | Notes |
|-------|-------|-------|
| `beforeSubmitPrompt` | yellow | User sent a prompt |
| `afterAgentThought` | yellow | Thinking block completed |
| `preToolUse` (Write\|Edit\|Shell) | red | Tool about to run |
| `afterFileEdit` | red | File was edited |
| `postToolUse` (Write\|Edit) | yellow | Back to thinking |
| `stop` | green | Turn finished |
| `sessionEnd` | green | Session closed |

Docs: https://cursor.com/docs/hooks
