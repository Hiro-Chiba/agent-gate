# agent-gate

[![CI](https://github.com/Hiro-Chiba/agent-gate/actions/workflows/ci.yml/badge.svg)](https://github.com/Hiro-Chiba/agent-gate/actions/workflows/ci.yml)

AI-powered CLAUDE.md enforcer for Claude Code.

---

Prevents Claude Code from forgetting CLAUDE.md rules during long sessions caused by context compression. AI validates every tool operation against your project rules and blocks violations.

## Features

- AI validation of CLAUDE.md rules (block mode)
- Uses Claude CLI by default (no additional API key required)
- Anthropic API direct call also supported
- Automatic CLAUDE.md collection (upward + downward directory walk)
- Optional cooldown between validations

## Requirements

- Node.js >= 22.0.0
- Claude Code (CLI) installed

## Installation

```bash
git clone https://github.com/Hiro-Chiba/agent-gate.git
cd agent-gate
./install.sh
```

The install script handles dependency install, build, and hook registration. Restart Claude Code to activate.

To remove the hook, run `./uninstall.sh` from the same directory.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `AGENT_GATE_MODEL` | `claude-sonnet-4-6` | Model used for validation |
| `AGENT_GATE_API_KEY` | — | Anthropic API key (uses API directly when set) |
| `AGENT_GATE_COOLDOWN` | `0` | Cooldown in seconds (0 = validate every time) |
| `AGENT_GATE_DISABLED` | `false` | Disable flag |
| `USE_SYSTEM_CLAUDE` | `false` | `true` forces PATH claude (default: `~/.claude/local/claude`, falls back to PATH if not found) |

## How It Works

1. Claude Code attempts to run `Edit`/`Write`/`Bash` — PreToolUse hook fires
2. agent-gate collects CLAUDE.md files from the project
3. AI checks the tool operation against the rules
4. Violation found, operation blocked. No violation, operation proceeds.

## Network Access

agent-gate only communicates with Anthropic endpoints, either directly via the Anthropic API (when `AGENT_GATE_API_KEY` is set) or indirectly through the Claude CLI subprocess. It does not contact any other external services, and it does not send telemetry.

## License

[MIT](LICENSE)
