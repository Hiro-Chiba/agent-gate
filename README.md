# agent-gate

[![CI](https://github.com/Hiro-Chiba/agent-gate/actions/workflows/ci.yml/badge.svg)](https://github.com/Hiro-Chiba/agent-gate/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@hiro-c/agent-gate)](https://www.npmjs.com/package/@hiro-c/agent-gate)
[![npm downloads](https://img.shields.io/npm/dt/@hiro-c/agent-gate)](https://www.npmjs.com/package/@hiro-c/agent-gate)
[![license](https://img.shields.io/npm/l/@hiro-c/agent-gate)](LICENSE)

Runtime rule enforcer for AI coding agents. Reads your `CLAUDE.md` / `AGENTS.md` / `.cursorrules` and enforces them at hook time in Claude Code, Gemini CLI, and Cursor.

## Install

```bash
npm install -g @hiro-c/agent-gate
agent-gate install
```

This registers a Claude Code `PreToolUse` hook in `~/.claude/settings.json`; restart Claude Code to activate. For Gemini CLI or Cursor, point your hook config at `agent-gate --agent gemini-cli` or `agent-gate --agent cursor`. Remove with `agent-gate uninstall`.

## How it works

```
hook → deterministic rules → AI validation → verdict
```

Catastrophic operations (`rm -rf /`, writes to `.env`, force-push to `main`, edits to `/etc`) are blocked deterministically and never reach the model. Everything else is validated by the AI against your aggregated instruction files. Block reasons describe the next correct step instead of just denying.

agent-gate is strictly opt-in: it does nothing until you add an `.agent-gate.config.*` file to your project. A throttled stderr warning fires until you add one or set `AGENT_GATE_NO_CONFIG_WARNING=1`.

## Config

```ts
// .agent-gate.config.ts
import { defineConfig, forbidCommandPattern } from '@hiro-c/agent-gate'

export default defineConfig({
  disabledRules: ['prevent-force-push-main'],
  protectedBranches: ['main', 'release'],
  customRules: [
    forbidCommandPattern({
      id: 'no-drop-table',
      match: /drop\s+table/i,
      reason: 'DROP TABLE is forbidden. Use a migration.',
    }),
  ],
})
```

Full options live on `AgentGatePluginConfig` in the source.

## Built-in safety rules

| Rule | Blocks |
|---|---|
| `prevent-rm-rf-root` | `rm -rf` on `/`, `$HOME`, `/etc`, etc. (handles `sudo` and flag variants) |
| `prevent-secret-file-write` | `Edit`/`Write` to `.env*`, `.ssh/*`, `.aws/credentials`, `*.pem`, `*.key` |
| `prevent-bash-secret-write` | Shell redirects to the same paths (`echo > .env`, `tee .ssh/id_rsa`) |
| `prevent-force-push-main` | `git push --force` to protected branches (allows `--force-with-lease`) |
| `prevent-system-path-write` | `Edit`/`Write` to `/etc`, `/usr`, `/System`, `/Library` |
| `prevent-secret-file-read` <sup>[1]</sup> | Reads of the same secret paths |

<sup>[1]</sup> The default Claude Code matcher is `Edit|Write|Bash` and does not include `Read`, so this rule does not fire under the default install. Add `Read` to the matcher in `~/.claude/settings.json` to enforce it. Gemini CLI and Cursor route reads through agent-gate automatically.

Disable any rule with `disabledRules` in your config, or `AGENT_GATE_DISABLED_RULES=id1,id2`.

## What gets sent to the model

On AI validation, the prompt contains the full text of every instruction file collected (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.cursor/rules/*.mdc`, `.clinerules`, `.windsurf/rules`, `.github/copilot-instructions.md`, `CONVENTIONS.md`) and the tool name and tool input being validated. Your source files are not sent. Operations blocked by a deterministic rule never reach the model.

The destination is the local `claude` CLI by default, the Anthropic API if `AGENT_GATE_API_KEY` is set, or the agent SDK if `AGENT_GATE_USE_SDK=1`. Keep sensitive content out of instruction files, or set `AGENT_GATE_DISABLED=true` to halt all model calls.

## CLI

| Command | What it does |
|---|---|
| `agent-gate install` / `uninstall` | Register or remove the Claude Code hook |
| `agent-gate daemon` | Long-lived Unix-socket server; pair with `AGENT_GATE_DAEMON=1` |
| `agent-gate` | Run as a hook (reads stdin; called internally) |

## Environment

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

## License

[MIT](LICENSE)
