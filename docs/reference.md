# Reference

## Install (per agent)

Claude Code:

```bash
npm install -g @hiro-c/agent-gate
agent-gate install
```

This registers a `PreToolUse` hook in `~/.claude/settings.json`. Restart Claude Code to activate. Remove with `agent-gate uninstall`.

Gemini CLI: point your hook config at `agent-gate --agent gemini-cli`.

Cursor 1.7: point your hook config at `agent-gate --agent cursor` (beta).

## CLI

| Command | What it does |
|---|---|
| `agent-gate install` / `uninstall` | Register or remove the Claude Code hook |
| `agent-gate daemon` | Long-lived Unix-socket server; pair with `AGENT_GATE_DAEMON=1` |
| `agent-gate` | Run as a hook (reads stdin; called internally) |

## Environment variables

| Var | Effect |
|---|---|
| `AGENT_GATE_DISABLED` | `true` skips all checks |
| `AGENT_GATE_DISABLED_RULES` | Comma-separated rule ids to skip |
| `AGENT_GATE_NO_CONFIG_WARNING` | `1` silences the no-config warning |
| `AGENT_GATE_NO_CONFIG_WARNING_TTL_SEC` | Throttle window for that warning (default `3600`) |
| `AGENT_GATE_MODEL` | Validation model (default `claude-sonnet-4-6`) |
| `AGENT_GATE_API_KEY` | Use the Anthropic API directly instead of the `claude` CLI |
| `AGENT_GATE_USE_SDK` | `1` prefers the Anthropic agent SDK |
| `USE_SYSTEM_CLAUDE` | `true` forces the PATH `claude` binary |
| `AGENT_GATE_REASON_LANG` | AI reason language: `auto` (default) / `en` / `ja` / ... |
| `AGENT_GATE_ON_ERROR` | `block` for fail-closed (default `allow`) |
| `AGENT_GATE_COOLDOWN` | Cooldown seconds between AI validations (default `0`) |
| `AGENT_GATE_LOG` | `1` writes decisions to `~/.agent-gate/log.jsonl` |
| `AGENT_GATE_DAEMON` | `1` routes through the daemon |
| `AGENT_GATE_SOCKET_PATH` | Daemon socket path (default `$TMPDIR/agent-gate.sock`) |
| `AGENT_GATE_CACHE_TTL_SEC` | Daemon cache TTL seconds (default `60`) |
| `AGENT_GATE_CACHE_SIZE` | Daemon cache max entries (default `256`) |

## Supported AI tools

Claude Code (default and most mature), Gemini CLI (`--agent gemini-cli`), Cursor 1.7 (`--agent cursor`, beta). Tools without a hook surface (Copilot, Cline, Aider, Codex web, Replit, Devin) cannot be enforced at runtime. Gemini CLI's transcript history is opportunistic until upstream issues land.
