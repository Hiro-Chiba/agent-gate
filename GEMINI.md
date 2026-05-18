# agent-gate — Project Rules for Gemini CLI

## Project Goal
A verification hook that ensures tool operations comply with rules defined in `CLAUDE.md` or `GEMINI.md`. It aims to prevent rule violations during long sessions.

## Development Workflow
```bash
npm run build    # TypeScript build
npm test         # Run all tests
npm run checks   # Typecheck + tests
```

## Project Structure
- `src/collector/`: Logic for gathering rule files (CLAUDE.md/GEMINI.md).
- `src/validation/`: AI verification using model clients.
- `src/hooks/`: Hook event handling and dispatch.
- `src/contracts/`: Shared types and Zod schemas.

## Commit Guidelines
- Atomic commits with one logical change per commit.
- Use conventional formats (`feat`, `fix`, `refactor`, etc.).
