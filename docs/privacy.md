# What gets sent to the model

On AI validation, the prompt contains the full text of every instruction file collected (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.cursor/rules/*.mdc`, `.clinerules`, `.windsurf/rules`, `.github/copilot-instructions.md`, `CONVENTIONS.md`) and the tool name and tool input being validated. Your source files are not sent. Operations blocked by a deterministic rule never reach the model.

The destination is the local `claude` CLI by default, the Anthropic API if `AGENT_GATE_API_KEY` is set, or the agent SDK if `AGENT_GATE_USE_SDK=1`. Keep sensitive content out of instruction files, or set `AGENT_GATE_DISABLED=true` to halt all model calls.
