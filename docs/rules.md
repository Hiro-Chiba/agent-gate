# How it works and built-in safety rules

Every `Edit` / `Write` / `Bash` call from the agent goes through:

```
hook → deterministic rules → AI validation → verdict
```

Catastrophic operations (`rm -rf /`, writes to `.env`, force-push to `main`, edits to `/etc`) are blocked deterministically and never reach the model. Everything else is validated by the AI against your aggregated instruction files. Block reasons describe the next correct step instead of just denying.

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
