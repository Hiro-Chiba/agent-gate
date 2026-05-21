# agent-gate

[![CI](https://github.com/Hiro-Chiba/agent-gate/actions/workflows/ci.yml/badge.svg)](https://github.com/Hiro-Chiba/agent-gate/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@hiro-c/agent-gate)](https://www.npmjs.com/package/@hiro-c/agent-gate)
[![npm downloads](https://img.shields.io/npm/dt/@hiro-c/agent-gate)](https://www.npmjs.com/package/@hiro-c/agent-gate)
[![license](https://img.shields.io/npm/l/@hiro-c/agent-gate)](LICENSE)

Runtime rule enforcer for AI coding agents. Reads your `CLAUDE.md` / `AGENTS.md` / `.cursorrules` and enforces them at hook time in Claude Code, Gemini CLI, and Cursor.

```
hook → deterministic rules → AI validation → verdict
```

## Quick start

```bash
npm install -g @hiro-c/agent-gate
agent-gate install
```

Restart Claude Code, then add an `.agent-gate.config.ts` at your project root. Without a config file the hook is registered but inactive.

## Docs

- [How it works and built-in safety rules](docs/rules.md)
- [Config and custom rules](docs/config.md)
- [What gets sent to the model](docs/privacy.md)
- [CLI, environment variables, supported tools](docs/reference.md)

## License

[MIT](LICENSE)
